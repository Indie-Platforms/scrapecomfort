import React, { useEffect, useRef, useState } from 'react';

export interface Option {
  name: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedOptions: Option[];
  setSelectedOptions: (options: Option[]) => void;
  onChangeProvidedOptions?: (options: Option[]) => void;
  disabled?: boolean;
}

interface ModalProps {
  show: boolean;
  closeModal: () => void;
  title: string;
  onAction?: () => void;
  actionText?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  show,
  closeModal,
  title,
  actionText,
  onAction,
  children,
}) => {
  const modalRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (show) {
      modalRef.current?.showModal();
    } else {
      modalRef.current?.close();
    }
  }, [show]);

  return (
    <dialog ref={modalRef} className="modal">
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4 space-y-6">{children}</div>
        <div className="modal-action">
          <button className="btn" onClick={closeModal}>
            Close
          </button>
          {onAction && actionText && (
            <button className="btn btn-primary" onClick={onAction}>
              {actionText}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
};

export const ExtractorsSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedOptions,
  setSelectedOptions,
  onChangeProvidedOptions,
  disabled = false,
}) => {
  console.log('Selected options: ', selectedOptions);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editOption, setEditOption] = useState<Option | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  const [extractionInstructions, setExtractionInstructions] = useState('');

  const addRemoveOption = (option: Option) => {
    if (!disabled) {
      const newSelected = selectedOptions.find(
        (opt) => opt.value === option.value
      )
        ? selectedOptions.filter((opt) => opt.value !== option.value)
        : [...selectedOptions, option];
      setSelectedOptions(newSelected);
    }
  };

  const addOption = () => {
    if (newOptionName.trim() !== '') {
      const newOptions = [
        ...options,
        { name: newOptionName, value: extractionInstructions },
      ];
      setSelectedOptions([
        ...selectedOptions,
        { name: newOptionName, value: extractionInstructions },
      ]);
      if (onChangeProvidedOptions) {
        onChangeProvidedOptions(newOptions);
      }
      setNewOptionName('');
      setExtractionInstructions('');
      setShowModal(false);
    }
  };

  const editExistingOption = () => {
    if (newOptionName.trim() !== '' && editOption) {
      const newOptions = options.map((opt) =>
        opt.value === editOption.value
          ? { name: newOptionName, value: extractionInstructions }
          : opt
      );
      setSelectedOptions(
        selectedOptions.map((opt) =>
          opt.value === editOption.value
            ? { name: newOptionName, value: extractionInstructions }
            : opt
        )
      );
      if (onChangeProvidedOptions) {
        onChangeProvidedOptions(newOptions);
      }
      setNewOptionName('');
      setExtractionInstructions('');
      setShowModal(false);
      setEditOption(null);
    }
  };

  useEffect(() => {
    const closeDropdown = (e: MouseEvent) => {
      if (!(e.target as Element).classList.contains('dropdown-ignore')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', closeDropdown);

    return () => {
      document.removeEventListener('click', closeDropdown);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center mx-auto">
      <Modal
        show={showModal}
        closeModal={() => setShowModal(false)}
        actionText="Save"
        onAction={editOption ? editExistingOption : addOption}
        title={editOption ? 'Edit Extractor' : 'Add New Extractor'}
      >
        <label className="block w-full flex justify-stetch items-center">
          <span className="font-bold w-3/5">Column Name</span>
          <input
            type="text"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            className="input w-3/6 input-bordered"
            placeholder="Column Name"
          />
        </label>
        <label className="block flex flex-col space-y-3 justify-stretch w-full">
          <span className="font-bold">ChatGPT Extraction Instructions</span>
          <textarea
            value={extractionInstructions}
            onChange={(e) => setExtractionInstructions(e.target.value)}
            className="textarea w-full textarea-bordered"
            placeholder="ChatGPT Instructions"
          />
        </label>
      </Modal>

      <div className="w-full px-4">
        <div className="flex flex-col items-center relative">
          <div className="w-full flex ">
            <span className="text-md font-bold text-slate-700 w-full">
              {' '}
              Data Extractors:{' '}
            </span>
            <div className="w-full text-right">
              <span
                className={`text-xs text-error font-bold text-left${
                  selectedOptions.length === 0 ? '' : ' opacity-0'
                }`}
              >
                specify extractors to start extracting data from scraped web
                pages.
              </span>
            </div>
          </div>
          <div className="flex w-full flex-row space-x-2 items-center">
            <div
              className={`my-2 p-1 flex-1 border ${
                selectedOptions.length === 0 ? 'border-error' : ''
              } w-full max-w-[960px] bg-base-100 rounded ${
                disabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex flex-auto flex-wrap ">
                {selectedOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex justify-center items-center m-1 font-medium py-1 px-2 rounded-full text-secondary-content bg-secondary border border-secondary "
                  >
                    <div
                      className="text-xs font-normal leading-none max-w-full flex-initial"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) {
                          setEditOption(option);
                          setExtractionInstructions(option.value);
                          setNewOptionName(option.name);
                          setShowModal(true);
                        }
                      }}
                    >
                      {option.name}
                    </div>
                    <div
                      className="flex flex-auto flex-row-reverse"
                      onClick={(e) => {
                        e.stopPropagation();
                        addRemoveOption(option);
                      }}
                    >
                      <div>
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className="h-4 w-4 ml-2 dropdown-ignore"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex-1">
                  <input
                    placeholder=""
                    className="bg-transparent p-1 px-2 appearance-none outline-none h-9 w-full text-base-800"
                    onClick={(e) => {
                      if (!disabled) {
                        e.stopPropagation();
                        setShowDropdown(!showDropdown);
                      }
                    }}
                    disabled={disabled}
                  />
                </div>
              </div>
              {showDropdown && (
                <div className="bg-base-100 w-full shadow absolute text-slate-700 top-[90px] right-0 max-h-40 overflow-y-auto z-10 dropdown dropdown-ignore">
                  {options.map((option) => (
                    <div
                      key={option.value}
                      className={`cursor-pointer border-transparent ${
                        selectedOptions.find((o) => o.value === option.value)
                          ? 'bg-secondary hover:bg-secondary-focus text-secondary-content hover:border-secondary'
                          : 'hover:bg-base-200 hover:border-secondary'
                      } flex w-full items-center p-2 pl-2 border-l-2 relative dropdown-ignore`}
                      onClick={() => addRemoveOption(option)}
                    >
                      <div className="w-full items-center flex">
                        <div className="mx-2 leading-6">{option.name}</div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t-2">
                    <div
                      className="cursor-pointer hover:bg-base-200 flex w-full items-center p-2 pl-2 border-transparent border-l-2 relative hover:border-secondary dropdown-ignore"
                      onClick={() => setShowModal(true)}
                    >
                      <div className="w-full items-center flex">
                        <div className="mx-2 leading-6">+ Add new </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
