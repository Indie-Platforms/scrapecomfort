import { Browser, BrowserContext, chromium } from 'playwright';
import { getChromePath } from 'chrome-launcher';
import crypto from 'crypto';
import Store from 'electron-store';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { ProcessState } from '../renderer/scraper/types';

const { Configuration, OpenAIApi } = require('openai');

enum PageState {
  NotStarted = 'Not Started',
  Failed = 'Failed',
  Skipped = 'Skipped',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Pending = 'Pending',
}

export interface UrlObject {
  link: string;
  scrapingStatus: PageState;
  extractingStatus: PageState;
  enabled: boolean;
}

const calculateHash = (input: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
};

const scrapingStore = new Store({ name: 'scraping' });
const extractingStore = new Store({ name: 'extracting' });

type DataStore = Store;

abstract class Worker {
  isStopping: boolean;

  taskLimit: number = 5;

  isRunning: boolean;

  workerType: 'scraper' | 'extractor' = 'scraper';

  statusField: 'scrapingStatus' | 'extractingStatus' = 'scrapingStatus';

  urlObjects: UrlObject[];

  dataStore: DataStore = scrapingStore;

  constructor(urlObjects: UrlObject[]) {
    this.isStopping = false;
    this.isRunning = false;
    this.urlObjects = urlObjects;
  }

  sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  abstract processData(
    event: any,
    urlObject: UrlObject
  ): Promise<[boolean | null, UrlObject | null]>;

  async start(event: any) {
    console.log(`Starting worker ${this.workerType}`);
    this.isRunning = true;
    this.isStopping = false;
    for (const urlObject of this.urlObjects) {
      if (urlObject[this.statusField] !== PageState.Completed) {
        urlObject[this.statusField] = PageState.Pending;
      }
    }
    event.reply('data-update', this.urlObjects);
    event.reply(`${this.workerType}-status`, ProcessState.InProgress);

    // Create a limit function with a concurrency of 5
    const limit = pLimit(this.taskLimit);

    // Create an array of promises for each URL object
    const promises = this.urlObjects.map((urlObject, i) =>
      limit(async () => {
        if (urlObject[this.statusField] === PageState.Completed) {
          return;
        }

        if (this.isStopping || !this.isRunning) {
          return;
        }

        if (urlObject.enabled) {
          urlObject[this.statusField] = PageState.InProgress;
          event.reply('data-update', this.urlObjects);
          const [isOk, result] = await this.processData(event, urlObject);
          if (isOk || isOk === null) {
            if (result) {
              this.urlObjects[i] = {
                ...urlObject,
                ...result,
              };
            }
            if (isOk === null) {
              this.urlObjects[i][this.statusField] = PageState.Skipped;
            } else {
              this.urlObjects[i][this.statusField] = PageState.Completed;
            }
          } else if (this.isStopping) {
            this.urlObjects[i][this.statusField] = PageState.NotStarted;
          } else {
            this.urlObjects[i][this.statusField] = PageState.Failed;
          }
          event.reply('data-update', this.urlObjects);
        }
      })
    );

    // Wait for all promises to resolve
    await Promise.all(promises);

    event.reply(`${this.workerType}-status`, ProcessState.Completed);
    this.isRunning = false;

    await this.stop(event);
  }

  async stop(event: any) {
    event.reply(`${this.workerType}-status`, ProcessState.Stopping);
    this.isStopping = true;
    for (const urlObject of this.urlObjects) {
      if (urlObject[this.statusField] === PageState.Pending) {
        urlObject[this.statusField] = PageState.NotStarted;
      }
    }
    while (this.isStopping && this.isRunning) {
      await this.sleep(1000);
    }
    while (this.isRunning) {
      await this.sleep(1000);
    }

    let isCompleted = true;
    for (const urlObject of this.urlObjects) {
      if (
        !(
          urlObject[this.statusField] === PageState.Completed ||
          urlObject[this.statusField] === PageState.Skipped ||
          urlObject[this.statusField] === PageState.Failed
        )
      ) {
        isCompleted = false;
        break;
      }
    }
    if (isCompleted) {
      event.reply(`${this.workerType}-status`, ProcessState.Completed);
    } else {
      event.reply(`${this.workerType}-status`, ProcessState.Stopped);
    }
    this.isStopping = false;
  }

  async reset(event: any, urlObjects?: UrlObject[]) {
    await this.stop(event);
    if (urlObjects) {
      this.urlObjects = urlObjects;
    } else {
      for (const urlObject of this.urlObjects) {
        urlObject[this.statusField] = PageState.NotStarted;
        urlObject.enabled = true;
      }
    }
    this.dataStore.clear();
    event.reply('data-update', this.urlObjects);
    event.reply(`${this.workerType}-status`, ProcessState.NotStarted);
  }

  async resetNotStarted(event: any, urlObjects?: UrlObject[]) {
    const urlObjectsToReset = urlObjects || this.urlObjects;

    await this.stop(event);
    for (const urlObject of urlObjectsToReset) {
      if (
        urlObject[this.statusField] === PageState.Skipped ||
        urlObject[this.statusField] === PageState.Pending
      ) {
        urlObject[this.statusField] = PageState.NotStarted;
      }
      console.log('urlObject', urlObject);
    }
    this.urlObjects = urlObjectsToReset;
    event.reply('data-update', this.urlObjects);
    event.reply(`${this.workerType}-status`, ProcessState.NotStarted);
  }

  async restart(event: any) {
    await this.reset(event);
    await this.start(event);
  }

  async resume(event: any) {
    if (this.isRunning) {
      return;
    }
    if (this.isStopping) {
      await this.stop(event);
    }
    await this.start(event);
  }
}

export type Option = {
  name: string;
  value: string;
};

type Embeddings = {
  embeddings: number[][];
};

class Extractor extends Worker {
  workerType: 'extractor' = 'extractor';

  statusField: 'extractingStatus' = 'extractingStatus';

  selectedOptions: Option[];

  dataStore: DataStore = extractingStore;

  openai: any;

  constructor(
    urlObjects: UrlObject[],
    selectedOptions: Option[],
    openAIApiKey: string
  ) {
    super(urlObjects);
    this.selectedOptions = selectedOptions;
    const configuration = new Configuration({
      apiKey: openAIApiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  getText = (html: string, baseUrl: string, summary: boolean): string => {
    // scriptingEnabled so noscript elements are parsed
    const $ = cheerio.load(html, { scriptingEnabled: true });

    let text = '';

    // lets only get the body if its a summary, dont need to summarize header or footer etc
    const rootElement = summary ? 'body ' : '*';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(`${rootElement}:not(style):not(script):not(svg)`).each(
      (_i, elem: any) => {
        // we dont want duplicated content as we drill down so remove children
        let content = $(elem).clone().children().remove().end().text().trim();
        const $el = $(elem);

        // if its an ahref, print the content and url
        let href = $el.attr('href');
        if ($el.prop('tagName')?.toLowerCase() === 'a' && href) {
          if (!href.startsWith('http')) {
            try {
              href = new URL(href, baseUrl).toString();
            } catch {
              // if this fails thats fine, just no url for this
              href = '';
            }
          }

          const imgAlt = $el.find('img[alt]').attr('alt')?.trim();
          if (imgAlt) {
            content += ` ${imgAlt}`;
          }

          text += ` [${content}](${href})`;
        }
        // otherwise just print the content
        else if (content !== '') {
          text += ` ${content}`;
        }
      }
    );

    return text.trim().replace(/\n+/g, ' ');
  };

  async parseHTMLWithEmbeddings(
    html: string,
    baseUrl: string,
    parameters: { name: string; value: string }[]
  ) {
    // Remove script and style tags from the HTML
    html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
    const text = this.getText(html, baseUrl, false);

    // Divide the HTML into manageable sections
    const sections = [];
    for (let i = 0; i < text.length; i += 512) {
      sections.push(text.slice(i, i + 512));
    }
    const textHash = calculateHash(text);

    // Create embeddings for each section
    let embeddings = [];
    const cachedEmbeddings: Embeddings = this.dataStore.get(textHash, {
      embeddings: undefined,
    }) as Embeddings;
    if (!cachedEmbeddings.embeddings) {
      for (let i = 0; i < sections.length; i++) {
        const embeddingResponse = await this.openai.createEmbedding({
          model: 'text-embedding-ada-002',
          input: sections[i],
        });
        const { embedding } = embeddingResponse.data.data[0];
        embeddings.push(embedding);
      }
      this.dataStore.set(textHash, { embeddings });
    } else {
      embeddings = cachedEmbeddings.embeddings;
    }

    // Initialize a conversation with the assistant
    const conversation = [
      {
        role: 'system',
        content:
          'You are an HTML parser. Your task is to extract user-specified fields' +
          ' from the provided HTML page and return them in JSON format.',
      },
      {
        role: 'user',
        content: '(Phone) (phone number)',
      },
      {
        role: 'user',
        content:
          "Here is the most similar section of the HTML: <div class='phone'>555-555-5555</div>",
      },
      {
        role: 'assistant',
        content: '{"result": "555-555-5555"}',
      },
    ];

    // Initialize a result object to store the extracted data
    const result: { [key: string]: any } = {};

    // Iterate over each parameter
    for (const param of parameters) {
      // Add the parameter to the conversation
      conversation.push({
        role: 'user',
        content: `(${param.name}) (${param.value})`,
      });

      // Create an embedding for the AI's prompt
      const aiPromptEmbeddingResponse = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: param.value,
      });
      const aiPromptEmbedding =
        aiPromptEmbeddingResponse.data.data[0].embedding;

      // Find the most similar embedding in your list
      const [mostSimilarIndex, secondMostSimilarIndex] =
        this.findMostSimilarEmbedding(aiPromptEmbedding, embeddings);

      // Add the corresponding HTML section to the conversation
      conversation.push({
        role: 'user',
        content: `Here is the most similar section of the HTML: ${sections[mostSimilarIndex]} | ${sections[secondMostSimilarIndex]}`,
      });

      // Use the prompt to extract data from the section with the right embedding
      const extractionResponse = await this.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversation,
      });

      // Extract the JSON response from the AI's message
      const aiMessage = extractionResponse.data.choices[0].message.content;
      result[param.name] = JSON.parse(aiMessage).result;
    }

    return result;
  }

  // Helper function to find the most similar embedding in a list
  findMostSimilarEmbedding(targetEmbedding: number[], embeddings: number[][]) {
    let mostSimilarIndex = 0;
    let secondMostSimilarIndex = 0;
    let highestSimilarity = -Infinity;
    let secondHighestSimilarity = -Infinity;

    for (let i = 0; i < embeddings.length; i++) {
      const similarity = this.calculateSimilarity(
        targetEmbedding,
        embeddings[i]
      );
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilarIndex = i;
      }
      if (
        similarity > secondHighestSimilarity &&
        similarity < highestSimilarity
      ) {
        secondHighestSimilarity = similarity;
        secondMostSimilarIndex = i;
      }
    }

    return [mostSimilarIndex, secondMostSimilarIndex];
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]) {
    // This function should calculate the cosine similarity (or another appropriate measure) between the two embeddings
    // This is a placeholder and should be replaced with your actual implementation
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] ** 2;
      magnitude2 += embedding2[i] ** 2;
    }
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    return dotProduct / (magnitude1 * magnitude2);
  }

  async processUrlObject(urlObject: UrlObject): Promise<UrlObject> {
    console.log('this.selectedOptions', this.selectedOptions);
    const html = scrapingStore.get(calculateHash(urlObject.link));
    if (!html) {
      throw new Error('No HTML found for this url');
    }
    const url = new URL(urlObject.link);
    const baseUrl = url.origin;
    const result = await this.parseHTMLWithEmbeddings(
      html as string,
      baseUrl,
      this.selectedOptions
    );
    if (!result) {
      throw new Error('No result returned for this url');
    }
    const updateObject = result;

    console.log('updateObject', updateObject);

    return {
      ...urlObject,
      ...updateObject,
    } as UrlObject;
  }

  async processData(
    event: any,
    urlObject: UrlObject
  ): Promise<[boolean | null, UrlObject | null]> {
    if (urlObject.scrapingStatus !== PageState.Completed) {
      return [null, null];
    }
    let isOk: boolean;
    let result = null;
    try {
      result = await this.processUrlObject(urlObject);
      this.dataStore.set(calculateHash(urlObject.link), result);
      isOk = true;
    } catch (error) {
      console.log('Error in processData');
      isOk = false;
      console.log(error);
    }
    return [isOk, result];
  }

  async start(event: any, openAIKey?: string) {
    if (openAIKey) {
      const configuration = new Configuration({
        apiKey: openAIKey,
      });
      this.openai = new OpenAIApi(configuration);
    }
    await super.start(event);
  }

  async resume(event: any, openAIKey?: string) {
    if (openAIKey) {
      const configuration = new Configuration({
        apiKey: openAIKey,
      });
      this.openai = new OpenAIApi(configuration);
    }
    await super.resume(event);
  }

  async reset(
    event: any,
    urlObjects?: UrlObject[],
    selectedOptions?: Option[],
    openAIKey?: string
  ) {
    if (urlObjects) {
      this.urlObjects = urlObjects;
    }
    await super.reset(event);

    if (openAIKey) {
      const configuration = new Configuration({
        apiKey: openAIKey,
      });
      this.openai = new OpenAIApi(configuration);
    }

    if (selectedOptions) {
      this.selectedOptions = selectedOptions;
    } else {
      this.selectedOptions = [];
    }
  }

  async restart(event: any, selectedOptions?: Option[], openAIKey?: string) {
    await this.reset(event, this.urlObjects, selectedOptions, openAIKey);
    await this.start(event);
  }
}

class Scraper extends Worker {
  browser: Browser | null;

  browserInitialization: Promise<Browser> | null = null;

  browserInitializationWait: number = 0;

  context: BrowserContext | null;

  workerType: 'scraper' = 'scraper';

  statusField: 'scrapingStatus' = 'scrapingStatus';

  dataStore: DataStore = scrapingStore;

  isHeadlessBrowser: boolean = true;

  constructor(urlObjects: UrlObject[]) {
    super(urlObjects);
    this.browser = null;
    this.context = null;
  }

  async processData(
    event: any,
    urlObject: UrlObject
  ): Promise<[boolean, null]> {
    let isOk: boolean;
    try {
      // Check if browser is initialized
      if (!this.browser || !this.browser.isConnected()) {
        // If the browser is not being initialized, start the initialization
        this.browser = await this.initBrowser(event);
      }
      // Create a new context for each task
      const context = await this.browser.newContext();
      const page = await context.newPage();

      await page.goto(urlObject.link);
      await page.waitForLoadState('networkidle');
      const pageContent = await page.content();
      this.dataStore.set(calculateHash(urlObject.link), pageContent);
      isOk = true;

      await context.close();
    } catch (error) {
      console.log('Error in processData');
      isOk = false;
      console.log(error);
    }
    return [isOk, null];
  }

  async reInitBrowser(event: any): Promise<Browser> {
    let browser: Browser | null = null;
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      const chromePath = getChromePath();
      browser = await chromium.launch({
        executablePath: chromePath,
        headless: this.isHeadlessBrowser,
      });

      if (!browser || !browser.isConnected()) {
        browser = null;
      }
    } catch (error) {
      console.log('Error in reInitBrowser');
      event.reply('browser-not-accessible');
      throw error;
    }
    if (!browser) {
      console.log('Error in reInitBrowser');
      event.reply('browser-not-accessible');
      throw new Error('Browser not accessible');
    }
    console.log('Browser initialized');
    console.log('Browser connected:', browser.isConnected());
    return browser;
  }

  async initBrowser(event: any): Promise<Browser> {
    console.log('initBrowser');
    if (!this.browserInitialization) {
      this.browserInitialization = this.reInitBrowser(event);
      await this.browserInitialization;
    }

    try {
      this.browserInitializationWait += 1;
      this.browser = await this.browserInitialization;
    } finally {
      this.browserInitializationWait -= 1;

      if (this.browserInitializationWait === 0) {
        this.browserInitialization = null;
      }
    }

    return this.browser;
  }

  async stop(event: any) {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    await super.stop(event);
  }
}
export { Extractor, Scraper };
