import React, { useEffect } from 'react';
import { ProgressData, ProcessState, PageState, View } from '../types';
import { StartProcess } from '../components/start-process';
import { ProgressTable } from '../components/progress-table';
import ConfirmationModal from '../components/confirmation-modal';

interface ScrapingStepProps {
  setView: (view: View) => void;
  chromePath: string;
  parsingState: ProcessState;
  setParsingState: (state: ProcessState) => void;
  setExtractingState: (state: ProcessState) => void;
  inputData: ProgressData[];
  setInputData: (data: ProgressData[]) => void;
  isHeadlessBrowser: boolean;
  setIsHeadlessBrowser: (value: boolean) => void;
}

const ScrapingStep: React.FC<ScrapingStepProps> = ({
  setView,
  parsingState,
  setParsingState,
  setExtractingState,
  inputData,
  setInputData,
  chromePath,
  setIsHeadlessBrowser,
  isHeadlessBrowser,
}) => {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    React.useState(false);

  const resetExtractingState = () => {
    setExtractingState(ProcessState.NotStarted);
    window.electron.ipcRenderer.sendMessage('reset-extracting', inputData);
  };
  const startParsing = () => {
    resetExtractingState();
    setParsingState(ProcessState.InProgress);
    if (parsingState === ProcessState.Completed) {
      window.electron.ipcRenderer.sendMessage(
        'restart-scraping',
        isHeadlessBrowser,
        inputData
      );
      return;
    }
    window.electron.ipcRenderer.sendMessage(
      'start-scraping',
      inputData,
      isHeadlessBrowser
    );
  };

  const stopParsing = () => {
    setParsingState(ProcessState.Stopping);
    window.electron.ipcRenderer.sendMessage('stop-scraping');
  };

  useEffect(() => {
    const startScrapingListener = (arg: unknown) => {
      setInputData(arg as ProgressData[]);
    };

    const stopScrapingListener = () => {
      console.log('stop-scraping');
      setParsingState(ProcessState.Stopped);
    };

    const browserAccessibleListener = () => {
      console.log('browser-not-accessible');
      setIsConfirmationModalOpen(true);
    };
    const browserListener = window.electron.ipcRenderer.on(
      'browser-not-accessible',
      browserAccessibleListener
    );
    const stoppingListener = window.electron.ipcRenderer.on(
      'stop-scraping',
      stopScrapingListener
    );
    const dataUpdateListener = window.electron.ipcRenderer.on(
      'data-update',
      startScrapingListener
    );

    // Cleanup function to remove the listener
    return () => {
      stoppingListener();
      dataUpdateListener();
      browserListener();
    };
  }, []);

  return (
    <>
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        title="Chrome inaccessible"
        message="Chrome is not accessible. Please check if the path is correct and if Chrome is installed."
        onConfirm={() => {
          setIsConfirmationModalOpen(false);
          setView('settings');
        }}
        confirmMessage="Go to Settings"
      />
      <StartProcess
        isStartPossible={!!chromePath}
        onNotPossibleStart={() => {
          setIsConfirmationModalOpen(true);
        }}
        processName="Scraping"
        restartTitle="Are you sure you want to restart the scraping?"
        restartMessage="This will clear all scraped pages, reset the progress of extraction step and start the scraping process again."
        progressData={inputData}
        processState={parsingState}
        stopProcess={stopParsing}
        startProcess={startParsing}
      />
      <div className="w-full flex flex-row justify-start items-end">
        <label className="ml-5 inline-flex items-center mt-3">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-gray-600"
            checked={!isHeadlessBrowser}
            onChange={() => setIsHeadlessBrowser(!isHeadlessBrowser)}
            disabled={
              parsingState === ProcessState.InProgress ||
              parsingState === ProcessState.Stopping
            }
          />
          <span className="ml-2 text text-sm text-gray-700">Show browser</span>
        </label>
        {/* <label className="ml-5 inline-flex items-center mt-3"> */}
        {/*  <input */}
        {/*    type="checkbox" */}
        {/*    className="form-checkbox h-4 w-4 text-gray-600" */}
        {/*    checked={saveAuthData} */}
        {/*    onChange={() => setSaveAuthData(!saveAuthData)} */}
        {/*    disabled={ */}
        {/*      parsingState === ProcessState.InProgress || */}
        {/*      parsingState === ProcessState.Stopping */}
        {/*    } */}
        {/*  /> */}
        {/*  <span className="ml-2 text text-sm text-gray-700"> */}
        {/*    Save auth data */}
        {/*  </span> */}
        {/* </label> */}
        {/* <button */}
        {/*  className="btn btn-xs ml-7" */}
        {/*  disabled={ */}
        {/*    parsingState === ProcessState.InProgress || */}
        {/*    parsingState === ProcessState.Stopping || */}
        {/*    saveAuthData */}
        {/*  } */}
        {/*  onClick={() => { */}
        {/*    openBrowser(chromePath); */}
        {/*  }} */}
        {/* > */}
        {/*  Open Browser */}
        {/* </button> */}
      </div>
      <ProgressTable processType="scraping" data={inputData} />
    </>
  );
};

export default ScrapingStep;
