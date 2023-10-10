import React from 'react';
import { Steps, ProcessState } from '../types';

interface Navigation {
  step: Steps;
  handleBack: () => void;
  handleNext: () => void;
  processState: ProcessState;
  atLeastOneItemProcessed?: boolean;
  inputData: any[];
}

const Navigation: React.FC<Navigation> = ({
  step,
  handleBack,
  handleNext,
  processState,
  inputData,
  atLeastOneItemProcessed = false,
}) => {
  const isBackDisabled = () => {
    return (
      step === Steps.INPUT_DATA ||
      processState === ProcessState.InProgress ||
      processState === ProcessState.Stopping
    );
  };

  const isNextDisabled = () => {
    return (
      step === Steps.OUTPUT_DATA ||
      (step === Steps.INPUT_DATA && !inputData.length) ||
      (step !== Steps.INPUT_DATA &&
        ((processState === ProcessState.NotStarted &&
          !atLeastOneItemProcessed) ||
          processState === ProcessState.InProgress ||
          processState === ProcessState.Stopping))
    );
  };

  return (
    <div className="space-x-5">
      <button
        onClick={handleBack}
        disabled={isBackDisabled()}
        className="btn btn-secondary"
      >
        Back
      </button>
      <ul className="steps p-5">
        <li
          className={`step ${step >= Steps.INPUT_DATA ? 'step-primary' : ''}`}
        >
          Select a sheets file
        </li>
        <li className={`step ${step >= Steps.SCRAPING ? 'step-primary' : ''}`}>
          Scrape data
        </li>
        <li
          className={`step ${step >= Steps.EXTRACTION ? 'step-primary' : ''}`}
        >
          Extract data
        </li>
        <li
          className={`step ${step >= Steps.OUTPUT_DATA ? 'step-primary' : ''}`}
        >
          Save data
        </li>
      </ul>
      <button
        onClick={handleNext}
        disabled={isNextDisabled()}
        className="btn btn-primary ml-2"
      >
        Next
      </button>
    </div>
  );
};

export default Navigation;
