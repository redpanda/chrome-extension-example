import { context, trace } from '@opentelemetry/api';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import { BaseInstrumentation, Transport, VERSION } from '@grafana/faro-web-sdk';

import { FaroSessionSpanProcessor, FaroTraceExporter, TracingInstrumentationOptions } from '@grafana/faro-web-tracing';
import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

export class TracingInstrumentation extends BaseInstrumentation {
  name = 'basic-tracing';
  version = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  constructor(private options: TracingInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    const options = this.options;
    const attributes: ResourceAttributes = {};

    if (this.config.app.name) {
      attributes[SEMRESATTRS_SERVICE_NAME] = this.config.app.name;
    }

    if (this.config.app.namespace) {
      attributes[SEMRESATTRS_SERVICE_NAMESPACE] = this.config.app.namespace;
    }

    if (this.config.app.version) {
      attributes[SEMRESATTRS_SERVICE_VERSION] = this.config.app.version;
    }

    if (this.config.app.environment) {
      attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = this.config.app.environment;
    }

    Object.assign(attributes, options.resourceAttributes);

    const resource = Resource.default().merge(new Resource(attributes));

    const provider = new BasicTracerProvider({resource});

    //provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

    provider.addSpanProcessor(new FaroSessionSpanProcessor(
        new BatchSpanProcessor(new FaroTraceExporter({ api: this.api }), {
            scheduledDelayMillis: TracingInstrumentation.SCHEDULED_BATCH_DELAY_MS,
            maxExportBatchSize: 30,
        }),
        this.metas
    ))

    provider.register()


    // registerInstrumentations({
    //   instrumentations: options.instrumentations
    // });

    this.api.initOTEL(trace, context);
  }
}