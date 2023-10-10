import React, { useEffect, useState } from 'react';
import { PageState, ProcessState, ProgressData, Steps, View } from './types';
import { Option } from './components/extractors-select';
import Navigation from './components/navigation';
import InputDataStep from './steps/input-data-step';
import ScrapingStep from './steps/scraping-step';
import ExtractionStep from './steps/extraction-step';
import OutputDataStep from './steps/output-data-step';

type ScraperProps = {
  setView: (view: View) => void;
  chromePath: string;
  openAIKey: string;
  step: number;
  handleBack: () => void;
  handleNext: () => void;
  parsingState: ProcessState;
  extractingState: ProcessState;
  inputData: ProgressData[];
  isHeadlessBrowser: boolean;
  setIsHeadlessBrowser: (value: boolean) => void;
  fileName: string;
  fileName1: (value: ((prevState: string) => string) | string) => void;
  setInputData: (
    value: ((prevState: ProgressData[]) => ProgressData[]) | ProgressData[]
  ) => void;
  setParsingState: (
    value: ((prevState: ProcessState) => ProcessState) | ProcessState
  ) => void;
  setExtractingState: (
    value: ((prevState: ProcessState) => ProcessState) | ProcessState
  ) => void;
  setSelectedOptions: (
    value: ((prevState: Option[]) => Option[]) | Option[]
  ) => void;
  setProvidedOptions: (
    value: ((prevState: Option[]) => Option[]) | Option[]
  ) => void;
  selectedOptions: Option[];
  providedOptions: Option[];
};

export function Scraper({
  setView,
  chromePath,
  openAIKey,
  step,
  handleBack,
  handleNext,
  parsingState,
  extractingState,
  inputData,
  fileName,
  fileName1,
  setInputData,
  setParsingState,
  setExtractingState,
  setSelectedOptions,
  setProvidedOptions,
  selectedOptions,
  providedOptions,
  isHeadlessBrowser,
  setIsHeadlessBrowser,
}: ScraperProps) {
  const [atLeastOneScrapingItemProcessed, setAtLeastOneScrapingItemProcessed] =
    useState<boolean>(false);
  const [
    atLeastOneExtractionItemProcessed,
    setAtLeastOneExtractionItemProcessed,
  ] = useState<boolean>(false);

  useEffect(() => {
    setAtLeastOneScrapingItemProcessed(
      inputData.some((item) => item.scrapingStatus === PageState.Completed)
    );
    setAtLeastOneExtractionItemProcessed(
      inputData.some((item) => item.extractionStatus === PageState.Completed)
    );
  }, [inputData]);

  return (
    <div className="w-6/7 space-y-10 flex flex-col items-center justify-center">
      <Navigation
        step={step}
        handleBack={handleBack}
        handleNext={handleNext}
        atLeastOneItemProcessed={
          (step === Steps.SCRAPING && atLeastOneScrapingItemProcessed) ||
          (step === Steps.EXTRACTION && atLeastOneExtractionItemProcessed)
        }
        processState={
          parsingState || (step >= Steps.EXTRACTION && extractingState)
        }
        inputData={inputData}
      />
      {step === Steps.INPUT_DATA && (
        <InputDataStep
          fileName={fileName}
          setFileName={fileName1}
          setInputData={setInputData}
          parsingState={parsingState}
          setParsingState={setParsingState}
          setExtractingState={setExtractingState}
        />
      )}
      {step === Steps.SCRAPING && (
        <ScrapingStep
          setView={setView}
          chromePath={chromePath}
          parsingState={parsingState}
          setParsingState={setParsingState}
          setExtractingState={setExtractingState}
          inputData={inputData}
          setInputData={setInputData}
          isHeadlessBrowser={isHeadlessBrowser}
          setIsHeadlessBrowser={setIsHeadlessBrowser}
        />
      )}
      {step === Steps.EXTRACTION && (
        <ExtractionStep
          setView={setView}
          openAIKey={openAIKey}
          extractingState={extractingState}
          setExtractingState={setExtractingState}
          inputData={inputData}
          setSelectedOptions={setSelectedOptions}
          setProvidedOptions={setProvidedOptions}
          selectedOptions={selectedOptions}
          providedOptions={providedOptions}
          setInputData={setInputData}
        />
      )}
      {step === Steps.OUTPUT_DATA && <OutputDataStep data={inputData} />}
    </div>
  );
}
