// Background process in service worker
import { createInternalLogger, initializeFaro, InternalLoggerLevel, defaultGlobalObjectKey, defaultUnpatchedConsole, ExtendedError, Stacktrace } from '@grafana/faro-core';
import { parseStacktrace, ConsoleTransport, FetchTransport, createSession } from '@grafana/faro-web-sdk';

import { trace, context,  diag, DiagConsoleLogger, DiagLogLevel, SpanStatusCode } from '@opentelemetry/api';
import { BatchSpanProcessor, WebTracerProvider, StackContextManager } from '@opentelemetry/sdk-trace-web';
import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
// import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { TracingInstrumentation } from './instrumentation';

import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { FaroSessionSpanProcessor, FaroTraceExporter } from '@grafana/faro-web-tracing';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const NAME = 'chrome-webextension-test';
const VERSION = '1.0.0';
const ENV = 'dev'

// init faro
const faro = initializeFaro({
  internalLoggerLevel: InternalLoggerLevel.VERBOSE,
  globalObjectKey: defaultGlobalObjectKey,
  instrumentations: [new TracingInstrumentation()],
  paused: false,
  app: {
    name: NAME,
    version: VERSION,
    environment: ENV
  },
  //metas: [],
  transports: [
    new FetchTransport({
      url: 'http://localhost:8027/collect',
      apiKey: 'api_key',
    }),
  ],
  dedupe: false,
  isolate: false,
  metas: [],
  parseStacktrace,
  preventGlobalExposure: false,
  unpatchedConsole: defaultUnpatchedConsole
});

const otel = faro.api.getOTEL();

// faro.api.pushLog(['Faro background was initialized']);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  //internalLogger.error('test')
  console.debug('console debug') // console.debug does not work in service worker?
  //internalLogger.debug('tttt') // does not work

  if (request.message === "button_clicked") {
    // push measurement
    faro.api.pushMeasurement({
      type: 'cart-transaction',
      values: {
        delay: 122,
        duration: 4000,
      },
    });

    // create trace
    if (otel) {
      const tracer = otel.trace.getTracer('background');
      const span = tracer.startSpan('click');
      otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
          // push log
          faro.api.pushLog(['Message received']);
          // span.setStatus({ code: SpanStatusCode.OK });
          span.end();
      });
    }
    sendResponse();
  }
});
