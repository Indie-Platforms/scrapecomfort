import React, { useState } from 'react';
import Papa from 'papaparse';
import { ProgressData } from '../types';

interface OutputDataStepProps {
  data: ProgressData[];
}

const OutputDataStep: React.FC<OutputDataStepProps> = ({ data }) => {
  const [saving, setSaving] = useState(false);

  function convertToCSV() {
    const headers = Object.keys(data[0]);
    return Papa.unparse({
      fields: headers,
      data,
    });
  }

  const copyToClipboard = async () => {
    try {
      // Automatic headers generation from the first item keys
      const csvContent = convertToCSV();
      await navigator.clipboard.writeText(csvContent);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const saveToFile = async () => {
    setSaving(true);
    try {
      const csvContent = convertToCSV();
      await window.electron.ipcRenderer.sendMessage(
        'save-file',
        'data.csv',
        csvContent
      );
    } catch (error) {
      console.error('Failed to save file:', error);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col space-y-4 w-2/4">
      <button className="btn btn-primary" onClick={copyToClipboard}>
        Copy to Clipboard
      </button>
      <div className="divider">OR</div>
      <button
        className="btn btn-primary"
        onClick={saveToFile}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save to File'}
      </button>
    </div>
  );
};

export default OutputDataStep;
