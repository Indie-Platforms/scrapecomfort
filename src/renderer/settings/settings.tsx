import React, { useEffect, useState } from 'react';
import { ProcessState } from '../scraper/types';

type SettingsProps = {
  appVersion: string;
  openAIKey: string;
  setOpenAIKey: (value: ((prevState: string) => string) | string) => void;
  chromePath: string;
  setChromePath: (value: ((prevState: string) => string) | string) => void;
  extractingState: ProcessState;
};

export function Settings({
  appVersion,
  openAIKey,
  setOpenAIKey,
  chromePath,
  setChromePath,
  extractingState,
}: SettingsProps) {
  const [tempOpenAIKey, setTempOpenAIKey] = useState<string>(openAIKey);
  const [tempChromePath, setTempChromePath] = useState<string>(chromePath);
  const [isCheckingOpenAIKey, setIsCheckingOpenAIKey] =
    useState<boolean>(false);
  const [isOpenAIKeyValid, setIsOpenAIKeyValid] = useState(!!openAIKey);

  useEffect(() => {
    const handleOpenAIKeyCheckingResult = (arg: unknown) => {
      const {
        ok,
        checkedOpenAIKey,
      }: { ok: boolean; checkedOpenAIKey: string } = arg as {
        ok: boolean;
        checkedOpenAIKey: string;
      };

      if (ok) {
        setOpenAIKey(checkedOpenAIKey);
        setIsOpenAIKeyValid(true);
      } else {
        setIsOpenAIKeyValid(false);
      }
      setIsCheckingOpenAIKey(false);
    };
    const stopListener = window.electron.ipcRenderer.on(
      'check-openai-key',
      handleOpenAIKeyCheckingResult
    );
    // Cleanup function to remove the listener
    return () => {
      stopListener();
    };
  }, []);

  const checkOpenAIKey = (checkedOpenAIKey: string) => {
    window.electron.ipcRenderer.sendMessage(
      'check-openai-key',
      checkedOpenAIKey
    );
    setIsCheckingOpenAIKey(true);
  };

  return (
    <div className="w-6/7 space-y-10 flex flex-col items-center justify-center w-full">
      <div className="text-xs text-gray-500">App Version: {appVersion}</div>
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">Chrome Browser Executable Path</span>
        </label>
        <div className="join w-full">
          <input
            className={`input w-full input-bordered join-item${
              chromePath ? '' : ' input-error'
            }`}
            disabled
            value={tempChromePath}
            onChange={(e) => setTempChromePath(e.target.value)}
            placeholder="Chrome Executable Path"
          />
          <button
            className="btn btn-primary join-item"
            disabled
            onClick={() => setChromePath(tempChromePath)}
          >
            Save
          </button>
        </div>
        {!chromePath && (
          <label className="label">
            <span className="label-text-alt text-error">
              Set chrome executable path to run pages scraping
            </span>
          </label>
        )}
      </div>
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">
            OpenAI API Key
            <a
              target="_blank"
              href="https://scrapecomfort-frontend.vercel.app/docs"
              className="label-text"
              rel="noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.2}
                stroke="currentColor"
                className="inline w-5 h-5 p-0.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            </a>
          </span>
        </label>
        <div className="join w-full">
          <input
            disabled={
              isCheckingOpenAIKey || extractingState === ProcessState.InProgress
            }
            className={`input w-full input-bordered join-item${
              !openAIKey || !isOpenAIKeyValid ? ' input-error' : ''
            }`}
            value={tempOpenAIKey}
            onChange={(e) => setTempOpenAIKey(e.target.value)}
            placeholder="OpenAI API Key"
          />
          <button
            disabled={
              isCheckingOpenAIKey ||
              !tempOpenAIKey ||
              extractingState === ProcessState.InProgress
            }
            className="btn btn-primary join-item"
            onClick={() => checkOpenAIKey(tempOpenAIKey)}
          >
            {isCheckingOpenAIKey ? 'Checking...' : 'Save'}
          </button>
        </div>
        {!isOpenAIKeyValid && (
          <label className="label">
            <span className="label-text-alt text-error">
              OpenAI API Key is not valid. Please check it again.
            </span>
          </label>
        )}
        {!openAIKey && (
          <label className="label">
            <span className="label-text-alt text-error">
              Set OpenAI API Key to run data extraction
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
