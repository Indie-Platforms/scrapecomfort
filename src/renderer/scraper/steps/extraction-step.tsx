import React, { useEffect } from 'react';
import { ProcessState, ProgressData, View } from '../types';
import { StartProcess } from '../components/start-process';
import { ProgressTable } from '../components/progress-table';
import { ExtractorsSelect, Option } from '../components/extractors-select';
import ConfirmationModal from '../components/confirmation-modal';

interface ExtractionStepProps {
  setView: (view: View) => void;
  openAIKey: string;
  extractingState: ProcessState;
  setExtractingState: (state: ProcessState) => void;
  inputData: ProgressData[];
  setSelectedOptions: (options: Option[]) => void;
  setProvidedOptions: (options: Option[]) => void;
  selectedOptions: Option[];
  providedOptions: Option[];
  setInputData: (data: ProgressData[]) => void;
}

const ExtractionStep: React.FC<ExtractionStepProps> = ({
  openAIKey,
  setView,
  extractingState,
  setExtractingState,
  inputData,
  setSelectedOptions,
  setProvidedOptions,
  selectedOptions,
  providedOptions,
  setInputData,
}) => {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    React.useState(false);

  const startExtraction = () => {
    setExtractingState(ProcessState.InProgress);
    if (extractingState === ProcessState.Completed) {
      window.electron.ipcRenderer.sendMessage('restart-extracting', {
        selectedOptions,
        openAIKey,
      });
      return;
    }
    window.electron.ipcRenderer.sendMessage('start-extracting', {
      selectedOptions,
      openAIKey,
    });
  };

  const stopExtraction = () => {
    setExtractingState(ProcessState.Stopping);
    window.electron.ipcRenderer.sendMessage('stop-extracting');
  };

  useEffect(() => {
    const startExtractorListener = (arg: unknown) => {
      setInputData(arg as ProgressData[]);
    };

    const stopExtractorListener = () => {
      setExtractingState(ProcessState.Stopped);
    };

    const extractorStoppingListener = window.electron.ipcRenderer.on(
      'stop-extracting',
      stopExtractorListener
    );
    const extractorDataUpdateListener = window.electron.ipcRenderer.on(
      'data-update',
      startExtractorListener
    );

    // Cleanup function to remove the listener
    return () => {
      extractorStoppingListener();
      extractorDataUpdateListener();
    };
  }, []);

  return (
    <>
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        title="OpenAI Key is not set"
        message="You need to specify OpenAI Key in the settings to start the extraction process."
        onConfirm={() => {
          setIsConfirmationModalOpen(false);
          setView('settings');
        }}
        confirmMessage="Go to Settings"
      />
      <StartProcess
        isStartPossible={!!openAIKey}
        onNotPossibleStart={() => {
          setIsConfirmationModalOpen(true);
        }}
        disabled={!inputData.length || selectedOptions.length === 0}
        processName="Extracting"
        restartTitle="Are you sure you want to restart the extraction?"
        restartMessage="This will clear all the extracted data and start the extraction process again."
        progressData={inputData}
        processState={extractingState}
        stopProcess={stopExtraction}
        startProcess={startExtraction}
      />
      <ExtractorsSelect
        disabled={false}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        onChangeProvidedOptions={setProvidedOptions}
        options={providedOptions}
      />
      <ProgressTable
        processType="extraction"
        additionalColumns={selectedOptions}
        data={inputData}
      />
    </>
  );
};

export default ExtractionStep;
