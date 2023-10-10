import React from 'react';
import { ProcessState, ProgressData } from '../types';
import { ProgressStats } from './progress-stats';
import ConfirmationModal from './confirmation-modal';

type StartProcessProps = {
  disabled?: boolean;
  processName: string;
  restartTitle: string;
  restartMessage: string;
  progressData: ProgressData[];
  processState: ProcessState;
  isStartPossible: boolean;
  onNotPossibleStart: () => void;
  atLeastOneItemProcessed?: boolean;
  stopProcess: () => void;
  startProcess: () => void;
};
export function StartProcess({
  processName,
  progressData,
  processState,
  stopProcess,
  startProcess,
  restartTitle,
  restartMessage,
  isStartPossible,
  onNotPossibleStart,
  atLeastOneItemProcessed = false,
  disabled = false,
}: StartProcessProps) {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    React.useState(false);

  return (
    <div className="flex flex-col w-full items-center justify-center">
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        title={restartTitle}
        message={restartMessage}
        onConfirm={() => {
          setIsConfirmationModalOpen(false);
          if (isStartPossible) {
            startProcess();
            return;
          }
          onNotPossibleStart();
        }}
        confirmMessage="Restart"
      />
      <div className="flex flex-row items-center justify-center w-full">
        <div className="w-4/6">
          <ProgressStats
            data={progressData}
            processState={processState}
            processName={processName}
          />
        </div>
        <div className="flex w-2/6 justify-end space-x-5">
          <div className="flex w-1/2">
            <button
              onClick={stopProcess}
              className="btn btn-warning w-full"
              disabled={
                processState === ProcessState.Stopping ||
                processState !== ProcessState.InProgress ||
                disabled
              }
            >
              Pause
            </button>
          </div>
          <div className="flex w-1/2">
            {(processState === ProcessState.Stopping ||
              processState === ProcessState.Stopped ||
              processState === ProcessState.InProgress) && (
              <button
                onClick={() => {
                  if (isStartPossible) {
                    startProcess();
                    return;
                  }
                  onNotPossibleStart();
                }}
                className="btn btn-success w-full"
                disabled={
                  processState === ProcessState.Stopping ||
                  processState === ProcessState.InProgress ||
                  disabled
                }
              >
                Continue
              </button>
            )}
            {processState === ProcessState.Completed && (
              <button
                onClick={() => {
                  setIsConfirmationModalOpen(true);
                }}
                className="btn btn-error w-full"
                disabled={disabled}
              >
                Restart
              </button>
            )}
            {processState === ProcessState.NotStarted && (
              <button
                onClick={() => {
                  if (isStartPossible) {
                    startProcess();
                    return;
                  }
                  onNotPossibleStart();
                }}
                className="btn btn-success w-full"
                disabled={disabled}
              >
                Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
