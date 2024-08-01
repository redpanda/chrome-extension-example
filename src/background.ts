// Background process in service worker
import { createInternalLogger, initializeFaro, InternalLoggerLevel, defaultGlobalObjectKey, defaultUnpatchedConsole, ExtendedError, Stacktrace } from '@grafana/faro-core';
import { parseStacktrace, ConsoleTransport, FetchTransport } from '@grafana/faro-web-sdk';

import { trace, context,  diag, DiagConsoleLogger, DiagLogLevel, SpanStatusCode } from '@opentelemetry/api';
import { BatchSpanProcessor, WebTracerProvider, StackContextManager } from '@opentelemetry/sdk-trace-web';
import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { FaroSessionSpanProcessor, FaroTraceExporter } from '@grafana/faro-web-tracing';

const NAME = 'chrome-webextension-test';
const VERSION = '1.0.0';
const ENV = 'dev'

const internalLogger = createInternalLogger(defaultUnpatchedConsole, InternalLoggerLevel.VERBOSE);
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);

// init faro
const faro = initializeFaro({
  internalLoggerLevel: InternalLoggerLevel.VERBOSE,
  globalObjectKey: defaultGlobalObjectKey,
  instrumentations: [new TracingInstrumentation({
    instrumentations: [new FetchInstrumentation()],
    spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
    // contextManager: new StackContextManager() // override the context manager?
  })],
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
    new ConsoleTransport(),
  ],
  dedupe: false,
  isolate: false,
  metas: [],
  parseStacktrace,
  preventGlobalExposure: false,
  unpatchedConsole: defaultUnpatchedConsole
});

faro.api.pushLog(['Faro background was initialized']);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  internalLogger.error('test')
  internalLogger.debug('tttt') // does not work

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
    const otel = faro.api.getOTEL();

    if (otel) {
      const span = otel.trace.getTracer('background').startSpan('click');
      otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
          // push log
          faro.api.pushLog(['Message received']);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          //faro.api.pushTraces(span)
      });
    }

    sendResponse();
  }
});
