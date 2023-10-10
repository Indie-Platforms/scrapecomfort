import React, { useEffect, useRef, useState } from 'react';
import { AdditionalColumn, PageState, ProgressData } from '../types';

type ProgressTableProps = {
  processType: 'scraping' | 'extraction';
  data: ProgressData[];
  additionalColumns?: AdditionalColumn[];
};

export function ProgressTable({
  data,
  additionalColumns,
  processType,
}: ProgressTableProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [tableHeight, setTableHeight] = useState('100vh'); // Assume initially that the table can take the whole viewport height

  useEffect(() => {
    const handleResize = () => {
      const yOffset = divRef.current?.getBoundingClientRect().top || 0;
      setTableHeight(`calc(100vh - ${yOffset}px)`);
    };

    window.addEventListener('resize', handleResize);

    handleResize(); // Call the function initially to set the height

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      ref={divRef}
      style={{ maxHeight: tableHeight }}
      className="overflow-hidden hover:overflow-scroll flex-none max-w-[1000px]"
    >
      <table
        className="table w-full min-w-[1000px] table-pin-rows"
        style={{
          overflowX: 'scroll',
        }}
      >
        <thead>
          <tr>
            <th>Scraping Status</th>
            <th>Extracting Status</th>
            <th>Link</th>
            {additionalColumns &&
              data.length > 0 &&
              additionalColumns.map((column, index) => (
                <th key={index}>{column.name}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((datum, index) => (
            <tr
              key={index}
              className={
                datum.scrapingStatus == PageState.Skipped &&
                processType == 'scraping'
                  ? 'bg-gray-200 opacity-50'
                  : datum.extractingStatus == PageState.Skipped &&
                    processType == 'extraction'
                  ? 'bg-gray-200 opacity-50'
                  : ''
              }
            >
              <td>
                {(() => {
                  if (datum.scrapingStatus == PageState.Completed) {
                    return (
                      <span className="badge badge-success">
                        {datum.scrapingStatus}
                      </span>
                    );
                  }
                  if (datum.scrapingStatus == PageState.InProgress) {
                    return (
                      <span className="badge badge-warning">
                        {datum.scrapingStatus}
                      </span>
                    );
                  }
                  if (datum.scrapingStatus == PageState.Pending) {
                    return (
                      <span className="badge badge-primary">
                        {datum.scrapingStatus}
                      </span>
                    );
                  }
                  if (datum.scrapingStatus == PageState.Failed) {
                    return (
                      <span className="badge badge-error">
                        {datum.scrapingStatus}{' '}
                      </span>
                    );
                  }
                  if (datum.scrapingStatus == PageState.NotStarted) {
                    return (
                      <span className="badge badge-secondary">
                        {datum.scrapingStatus}
                      </span>
                    );
                  }
                  return (
                    <span className="badge badge-neutral">
                      {datum.scrapingStatus}
                    </span>
                  );
                })()}
              </td>
              <td>
                {(() => {
                  if (datum.extractingStatus == PageState.Completed) {
                    return (
                      <span className="badge badge-success">
                        {datum.extractingStatus}
                      </span>
                    );
                  }
                  if (datum.extractingStatus == PageState.InProgress) {
                    return (
                      <span className="badge badge-warning">
                        {datum.extractingStatus}
                      </span>
                    );
                  }
                  if (datum.extractingStatus == PageState.Pending) {
                    return (
                      <span className="badge badge-primary">
                        {datum.extractingStatus}
                      </span>
                    );
                  }
                  if (datum.extractingStatus == PageState.Failed) {
                    return (
                      <span className="badge badge-error">
                        {datum.extractingStatus}{' '}
                      </span>
                    );
                  }
                  if (datum.extractingStatus == PageState.NotStarted) {
                    return (
                      <span className="badge badge-secondary">
                        {datum.extractingStatus}{' '}
                      </span>
                    );
                  }
                  return (
                    <span className="badge badge-neutral">
                      {datum.extractingStatus}
                    </span>
                  );
                })()}
              </td>
              <td>{datum.link}</td>
              {additionalColumns &&
                additionalColumns.map((column, index) => (
                  <td key={index}>{datum[column.name]}</td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
