import React, { useEffect, useState } from 'react';
import { ProcessState, ProgressData, Steps, View } from './scraper/types';
import { Option } from './scraper/components/extractors-select';
import { Navbar } from './components/navbar';

import './App.css';
import 'react-toastify/dist/ReactToastify.css';

import { Scraper } from './scraper/scraper';
import { Settings } from './settings/settings';
import { ToastContainer } from 'react-toastify';

const App: React.FC = () => {
  const [openAIKey, setOpenAIKey] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('0.0.0');
  const [isHeadlessBrowser, setIsHeadlessBrowser] = useState<boolean>(false);
  const [chromePath, setChromePath] = useState<string>('');
  const [isStateRestored, setIsStateRestored] = useState<boolean>(false);
  const [view, setView] = useState<View>('scraping');
  const [step, setStep] = useState<number>(Steps.INPUT_DATA);
  const [fileName, setFileName] = useState<string>('');
  const [inputData, setInputData] = useState<ProgressData[]>([]);
  const [parsingState, setParsingState] = useState<ProcessState>(
    ProcessState.NotStarted
  );
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [providedOptions, setProvidedOptions] = useState<Option[]>([
    { name: 'Email', value: '12' },
    { name: 'Phone', value: '1233' },
  ]);

  const [extractingState, setExtractingState] = useState<ProcessState>(
    ProcessState.NotStarted
  );

  useEffect(() => {
    const setScraperState = (arg: unknown) => {
      if (arg) {
        setParsingState(arg as ProcessState);
      }
    };
    const setExtractorState = (arg: unknown) => {
      if (arg) {
        setExtractingState(arg as ProcessState);
      }
    };

    const scraperStateListener = window.electron.ipcRenderer.on(
      'scraper-status',
      setScraperState
    );
    const extractorStateListener = window.electron.ipcRenderer.on(
      'extractor-status',
      setExtractorState
    );

    // Cleanup function to remove the listener
    return () => {
      scraperStateListener();
      extractorStateListener();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const restoreState = ([appVersion, state]: [string, any]) => {
        const savedState = state as {
          view: View;
          step: number;
          fileName: string;
          inputData: ProgressData[];
          selectedOptions: Option[];
          providedOptions: Option[];
          chromePath: string;
          openAIKey: string;
          isHeadlessBrowser: boolean;
        };
        console.log('App version', appVersion);
        setAppVersion(appVersion);
        console.log('Restoring state', savedState);
        if (savedState) {
          setView(savedState.view);
          setStep(savedState.step);
          setFileName(savedState.fileName);
          setInputData(savedState.inputData);
          setSelectedOptions(savedState.selectedOptions);
          setProvidedOptions(savedState.providedOptions);
          setChromePath(savedState.chromePath);
          setOpenAIKey(savedState.openAIKey);
          setIsHeadlessBrowser(savedState.isHeadlessBrowser);
        }
        setIsStateRestored(true);
      };
      window.electron.ipcRenderer.sendMessage('get-state');
      const stateRestorer = window.electron.ipcRenderer.on(
        'get-state',
        restoreState
      );

      // Cleanup function to remove the listener
      return () => {
        stateRestorer();
      };
    })();
  }, []);

  // Save state to the Electron store when state changes
  useEffect(() => {
    (() => {
      if (!isStateRestored) {
        return;
      }
      console.log('Saving state');
      window.electron.ipcRenderer.sendMessage('set-state', {
        view,
        step,
        fileName,
        inputData,
        selectedOptions,
        providedOptions,
        chromePath,
        openAIKey,
        isHeadlessBrowser,
      });
    })();
  }, [
    view,
    step,
    fileName,
    inputData,
    parsingState,
    selectedOptions,
    providedOptions,
    extractingState,
    chromePath,
    openAIKey,
    isHeadlessBrowser,
  ]);

  useEffect(() => {
    if (isStateRestored && !chromePath) {
      window.electron.ipcRenderer.sendMessage('get-chrome-path');
      const chromePathDetectorListener = window.electron.ipcRenderer.on(
        'get-chrome-path',
        (chromePath) => {
          setChromePath(chromePath as string);
        }
      );

      return () => {
        chromePathDetectorListener();
      };
    }
  }, [chromePath, isStateRestored]);

  const handleBack = () => {
    if (step > Steps.INPUT_DATA) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < Steps.OUTPUT_DATA) {
      setStep(step + 1);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-start items-center">
      <div className="max-w-screen-lg min-w-full">
        <Navbar view={view} setView={setView} />
        <div className="flex flex-col items-center p-6 space-y-6 min-w-screen-lg">
          {view === 'scraping' && (
            <Scraper
              setView={setView}
              openAIKey={openAIKey}
              chromePath={chromePath}
              step={step}
              handleBack={handleBack}
              handleNext={handleNext}
              parsingState={parsingState}
              extractingState={extractingState}
              inputData={inputData}
              fileName={fileName}
              fileName1={setFileName}
              setInputData={setInputData}
              setParsingState={setParsingState}
              setExtractingState={setExtractingState}
              setSelectedOptions={setSelectedOptions}
              setProvidedOptions={setProvidedOptions}
              isHeadlessBrowser={isHeadlessBrowser}
              setIsHeadlessBrowser={setIsHeadlessBrowser}
              selectedOptions={selectedOptions}
              providedOptions={providedOptions}
            />
          )}
          {view === 'settings' && (
            <Settings
              appVersion={appVersion}
              openAIKey={openAIKey}
              setOpenAIKey={setOpenAIKey}
              chromePath={chromePath}
              setChromePath={setChromePath}
              extractingState={extractingState}
            />
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default App;
