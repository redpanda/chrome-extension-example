import React, { useEffect, useState } from "react";
import { hydrateRoot } from 'react-dom/client';
import { FaroErrorBoundary, ReactIntegration, ReactRouterVersion } from '@grafana/faro-react';
import { getWebInstrumentations, initializeFaro, InternalLoggerLevel } from '@grafana/faro-web-sdk';

import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';
import { SpanStatusCode } from '@opentelemetry/api';
import { TracingInstrumentation } from "@grafana/faro-web-tracing";
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from "react-router-dom";

const NAME = 'chrome-webextension-test';
const VERSION = '1.0.0';
const ENV = 'dev'

const faro = initializeFaro({
  internalLoggerLevel: InternalLoggerLevel.VERBOSE,
  url: `http://localhost:8027/collect`,
  apiKey: 'api_key',
  trackWebVitalsAttribution: true,
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: true,
    }),
    new TracingInstrumentation(),
    new ReactIntegration({
      router: {
        version: ReactRouterVersion.V6,
        dependencies: {
          createRoutesFromChildren,
          matchRoutes,
          Routes,
          useLocation,
          useNavigationType,
        },
      },
    }),
  ],
  app: {
    name: NAME,
    version: VERSION,
    environment: ENV,
  },
});

faro.api.pushLog(['Faro was initialized']);

const Popup = () => {
  const [count, setCount] = useState(0);
  const [currentURL, setCurrentURL] = useState<string>();

  useEffect(() => {
    chrome.action.setBadgeText({ text: count.toString() });
  }, [count]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url);
    });
  }, []);

  const changeBackground = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            color: "#555555",
          },
          (msg) => {
            console.log("result message:", msg);
          }
        );
      }
    });
  };

  const sendMessageButton = () => {
    const otel = faro.api.getOTEL();

    if (otel) {
      const span = otel.trace.getTracer('popup').startSpan('user-interaction');

      otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
        faro.api.pushLog(['send button clicked']);
        chrome.runtime.sendMessage({ message: "button_clicked" });
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });
    }

  }

  return (
    <>
      <div>
        <ul style={{ minWidth: "700px" }}>
          <li>Current URL: {currentURL}</li>
          <li>Current Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
      <ButtonGroup>
        <Button
          onClick={() => setCount(count + 1)}
          style={{ marginRight: "5px" }}
        >
          count up
        </Button>
        <Button onClick={changeBackground}>change background</Button>
        <Button onClick={sendMessageButton}>send message</Button>
      </ButtonGroup>
    </>
  );
};

hydrateRoot(
  document.getElementById("root") as HTMLElement,
  <React.StrictMode>
    <FaroErrorBoundary>
      <Popup />
    </FaroErrorBoundary>
  </React.StrictMode>
);
