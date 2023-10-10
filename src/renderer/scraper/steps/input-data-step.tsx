import React, { ChangeEvent, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'react-toastify';
import { PageState, ProcessState, ProgressData } from '../types';
import ConfirmationModal from '../components/confirmation-modal';

function transformLink(link: string): string {
  const regex: RegExp =
    /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/.*$/;
  const match: RegExpMatchArray | null = link.match(regex);
  if (!match) {
    return link;
  }
  const spreadsheetId: string = match[1];
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
}

interface RowData {
  link?: string;
  url?: string;
  URL?: string;
  Url?: string;
  LINK?: string;
  Link?: string;
}

interface InputDataStepProps {
  fileName: string;
  setFileName: (name: string) => void;
  setInputData: (data: any[]) => void;
  parsingState: ProcessState;
  setParsingState: (state: ProcessState) => void;
  setExtractingState: (state: ProcessState) => void;
}

const InputDataStep: React.FC<InputDataStepProps> = ({
  fileName,
  setFileName,
  setInputData,
  parsingState,
  setParsingState,
  setExtractingState,
}) => {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    React.useState(false);
  const [currentTab, setCurrentTab] = React.useState<string>('file');

  const [inputValue, setInputValue] = useState<string>('');
  const resetNextSteps = (inputData: any[]) => {
    setParsingState(ProcessState.NotStarted);
    setExtractingState(ProcessState.NotStarted);
    window.electron.ipcRenderer.sendMessage('reset-scraping', inputData);
  };
  const onFileChange = (fileName: string, data: any[]) => {
    resetNextSteps(data);
    setInputData(data);
    setFileName(fileName);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      parseFile(file);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let response: Response;
    let file: File;
    try {
      response = await fetch(transformLink(inputValue));
      if (!response.ok) {
        toast("Invalid URL. Can't fetch data from this URL.", {
          type: 'error',
        });
        return;
      }
      file = new File([await response.blob()], new URL(inputValue).pathname);
    } catch (e) {
      toast("Invalid URL. Can't fetch data from this URL.", {
        type: 'error',
      });
      return;
    }

    parseFile(file);
  };

  const handlePlainTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/; // This is a simple URL validation regex

    const urls = inputValue.split('\n').map((link) => link.trim());

    // Check if any of the URLs are invalid
    if (urls.some((url) => !urlRegex.test(url))) {
      toast('Failed to parse urls. Some of urls are invalid.', {
        type: 'error',
      });
      return;
    }

    const data = urls.map((url) => {
      return {
        link: url,
        scrapingStatus: PageState.NotStarted,
        extractingStatus: PageState.NotStarted,
        enabled: true,
      };
    });

    onFileChange('urls', data);
  };

  const parseFile = (file: File) => {
    Papa.parse<RowData>(file, {
      header: true,
      complete(results) {
        let data: ProgressData[] = [];
        try {
          data = results.data.map((row) => {
            const link =
              row?.link ||
              row?.url ||
              row?.URL ||
              row?.Url ||
              row?.LINK ||
              row?.Link ||
              '';
            if (!link) {
              throw new Error(
                "Table must contain a column named 'link' or 'url' with the links to scrape"
              );
            }
            return {
              link,
              scrapingStatus: PageState.NotStarted,
              extractingStatus: PageState.NotStarted,
              enabled: true,
            };
          });
          if (data.length === 0) {
            toast('No valid rows found in file', {
              type: 'error',
            });
            return;
          }
        } catch (e) {
          if (e instanceof Error) {
            toast(e.message, {
              type: 'error',
            });
            return;
          }
          toast('Unknown error while parsing file', {
            type: 'error',
          });
          return;
        }

        onFileChange(file.name, data);
      },
    });
  };

  const resetInput = () => {
    setInputValue('');
    onFileChange('', []);
  };
  const activeTabClasses = 'inline-block p-4 border-b-2 rounded-t-lg';
  const inactiveTabClasses =
    'inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300';

  return (
    <div className="flex space-y-3 mt-0 flex-col items-center justify-center w-4/5">
      {fileName ? (
        <div className="flex shadow font-bold items-center justify-between p-4 rounded-md w-full">
          <p className="text-primary truncate xm-2">{fileName}</p>
          <button
            className="btn xm-2 btn-secondary"
            onClick={() => {
              if (parsingState === ProcessState.NotStarted) {
                resetInput();
                return;
              }
              setIsConfirmationModalOpen(true);
            }}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="w-full space-y-10">
          <div className="w-full border-b border-gray-200 dark:border-gray-700">
            <ul
              className="flex flex-wrap -mb-px text-sm font-medium text-center"
              role="tablist"
            >
              <li className="mr-2" role="presentation">
                <button
                  className={
                    currentTab === 'file'
                      ? activeTabClasses
                      : inactiveTabClasses
                  }
                  type="button"
                  role="tab"
                  aria-selected="false"
                  onClick={() => setCurrentTab('file')}
                >
                  File
                </button>
              </li>
              <li className="mr-2" role="presentation">
                <button
                  className={
                    currentTab === 'plain-text'
                      ? activeTabClasses
                      : inactiveTabClasses
                  }
                  type="button"
                  role="tab"
                  onClick={() => setCurrentTab('plain-text')}
                  aria-selected="false"
                >
                  Plain Text
                </button>
              </li>
            </ul>
          </div>
          {currentTab === 'file' ? (
            <div className="w-full">
              <form onSubmit={handleUrlSubmit} className="w-full space-x-5">
                <input
                  type="text"
                  className="input input-bordered truncate w-3/4"
                  placeholder="Enter CSV URL or Google Sheets link"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button className="btn btn-primary w-1/5" type="submit">
                  Submit
                </button>
              </form>
              <div className="divider">OR</div>
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-60 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
              >
                <input
                  id="dropzone-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    aria-hidden="true"
                    className="w-10 h-10 mb-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">
                      Click to upload or enter URL
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supported formats: CSV
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="w-full">
              <form
                onSubmit={handlePlainTextSubmit}
                className="w-full space-y-5"
              >
                <textarea
                  className="input input-bordered truncate w-full h-60"
                  placeholder="Enter URLs separated by new lines"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button className="btn m-0 btn-primary w-full" type="submit">
                  Submit
                </button>
              </form>
            </div>
          )}
        </div>
      )}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        title="Are you sure you want to delete the input data?"
        message="This will reset the scraping and extracting progress."
        onConfirm={() => {
          setIsConfirmationModalOpen(false);
          resetInput();
        }}
        confirmMessage="Delete"
      />
    </div>
  );
};

export default InputDataStep;
