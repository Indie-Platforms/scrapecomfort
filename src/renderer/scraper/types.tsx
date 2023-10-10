// Data types
export type ProgressData = {
  link: string;
  scrapingStatus: string;
  extractingStatus: string;
  enabled: boolean;
  [key: string]: string | boolean;
};

export enum ProcessState {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum PageState {
  NotStarted = 'Not Started',
  Failed = 'Failed',
  Skipped = 'Skipped',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Pending = 'Pending',
}

export type AdditionalColumn = {
  name: string;
};

export enum Steps {
  INPUT_DATA,
  SCRAPING,
  EXTRACTION,
  OUTPUT_DATA,
}

export type View = 'scraping' | 'settings';
