import React from 'react';
import type { View } from '../scraper/types';
import { WEBSITE_LINK, FEEDBACK_FORM } from '../constants';

type NavbarProps = {
  view: View;
  setView: (view: View) => void;
};
export function Navbar({ view, setView }: NavbarProps) {
  return (
    <div className="navbar bg-base-100">
      <div className="flex-1 space-x-5">
        <a
          className="btn btn-ghost normal-case text-xl"
          onClick={() => window.open(WEBSITE_LINK, '_blank')}
        >
          Scrape Comfort
        </a>
        <button
          className="btn btn-xs rounded-btn"
          onClick={() => window.open(FEEDBACK_FORM, '_blank')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          Feedback / Feature Request
        </button>
      </div>
      <div className="flex-none">
        <div className="tabs tabs-boxed">
          <a
            onClick={() => setView('scraping')}
            className={`tab tab-lifted ${
              view === 'scraping' ? 'tab-active' : ''
            }`}
          >
            Scraping
          </a>
          <a
            onClick={() => setView('settings')}
            className={`tab tab-lifted ${
              view === 'settings' ? 'tab-active' : ''
            }`}
          >
            Settings
          </a>
        </div>
      </div>
    </div>
  );
}
