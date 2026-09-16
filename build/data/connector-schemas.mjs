/* build/data/connector-schemas.mjs — raw JSON Schema per connector, queried live from the
 * `Connector` model on the fuuz-administration tenant (system_query_model, 2026-09-16). Same
 * point-in-time-snapshot tradeoff as connector-docs.mjs: not reachable from the public Actions
 * runner, re-sync by hand against the live tenant when a connector's schema changes.
 *
 * PROTOTYPE: three connectors only (Salesforce, HTTP, OpenAI Chat), chosen to stress-test the
 * schema-tree renderer against a plain object schema, a generic passthrough, and a schema with
 * nested anyOf branches + deep objects. Extend this file with the remaining 44 connectors using
 * the same query (Connector { name optionsSchema credentialsSchema inputSchema outputSchema })
 * once the viewer is approved.
 */

export const CONNECTOR_SCHEMAS = {
  'Salesforce': {
    optionsSchema: {},
    inputSchema: {
      type: 'array', minItems: 1,
      description: 'Array of Salesforce REST API requests. Each item returns `{ data, errors }`.',
      items: {
        type: 'object', description: 'A single Salesforce API request.',
        properties: {
          method: { type: 'string', enum: ['get', 'patch', 'put', 'post', 'delete', 'head'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Salesforce API path (e.g. `/services/data/v58.0/sobjects/Account`).' },
          data: { type: 'object', description: 'Request body.' },
          params: { type: 'object', description: 'Query string parameters.' },
          options: { type: 'object', description: 'Per-request options. Supports `pagination: true` to auto-follow `nextRecordsUrl` across pages.' },
        },
      },
    },
    outputSchema: {
      type: 'array', minItems: 0,
      items: {
        type: 'object',
        properties: {
          data: { type: ['array', 'object', 'string'], minItems: 0, items: { type: 'object' } },
          errors: { type: 'array', minItems: 0, items: { type: 'object' } },
        },
      },
    },
  },

  'HTTP': {
    optionsSchema: {
      type: 'object', additionalProperties: false,
      properties: { Headers: { type: 'object', additionalProperties: true, inputProps: { type: 'json' } } },
    },
    inputSchema: {
      type: 'array', minItems: 1,
      description: 'Array of HTTP requests to execute against the configured endpoint.',
      items: {
        type: 'object', description: 'A single HTTP request.',
        properties: {
          options: { type: 'object', description: 'Per-request options.', properties: { returnHeaders: { type: 'boolean', description: 'When true, returns `{ response, headers }` instead of just the response body.' } } },
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Path appended to the connection URL.' },
          headers: { type: 'object', description: 'Request headers, merged over the connection default headers.' },
          responseType: { type: 'string', enum: ['binary', 'json', 'text'], description: 'Expected response format. `binary` returns a base64-encoded string. Defaults to `json`.' },
          data: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Request body. Sent as JSON unless `responseType` indicates otherwise.' },
        },
        required: ['method', 'path'],
      },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'OpenAI Chat': {
    optionsSchema: { type: 'object', description: 'Default options applied to all operations using this connection.', inputProps: { type: 'json' } },
    inputSchema: {
      type: 'array', minItems: 1,
      description: 'Array of OpenAI ChatCompletion requests. Connection options are deep-merged with each request (useful for default system messages). Additional OpenAI parameters (temperature, max_tokens, etc.) may be passed as extra properties.',
      items: {
        type: 'object', description: 'A single ChatCompletion request forwarded to `client.chat.completions.create`.',
        properties: {
          model: { type: 'string', description: 'OpenAI model name (e.g. `gpt-4`, `gpt-3.5-turbo`).' },
          messages: {
            type: 'array', description: 'Ordered conversation history. Each message matches one of the role-specific variants below.',
            items: {
              anyOf: [
                { type: 'object', required: ['content', 'role'], properties: {
                  content: { type: ['string', 'array'], minItems: 1, description: 'The contents of the message.', items: { type: 'string' } },
                  role: { type: 'string', enum: ['system', 'user'], description: "The role of the message's author." },
                  name: { type: 'string', description: 'An optional name for the participant.' },
                } },
                { type: 'object', required: ['role'], properties: {
                  content: { type: ['string', 'null'], description: 'The contents of the assistant message.' },
                  role: { type: 'string', enum: ['assistant'], description: "The role of the message's author, in this case 'assistant'." },
                  tool_calls: { type: 'array', description: 'The tool calls generated by the model, such as function calls.', items: { type: 'object', required: ['id', 'type', 'function'], properties: {
                    id: { type: 'string', description: 'The ID of the tool call.' },
                    type: { type: 'string', enum: ['function'], description: "The type of the tool. Currently, only 'function' is supported." },
                    function: { type: 'object', description: 'The function that the model called.', properties: {
                      name: { type: 'string', description: 'The name of the function to call.' },
                      arguments: { type: 'string', description: 'The arguments to call the function with, as generated by the model in JSON format.' },
                    } },
                  } } },
                } },
                { type: 'object', required: ['role', 'content', 'tool_call_id'], properties: {
                  role: { type: 'string', enum: ['tool'], description: "The role of the message's author, in this case 'tool'." },
                  content: { type: ['string', 'array'], minItems: 1, description: 'The contents of the tool message.', items: { type: 'string' } },
                  tool_call_id: { type: 'string', description: 'Tool call that this message is responding to.' },
                } },
              ],
            },
          },
        },
        required: ['model', 'messages'],
      },
    },
    outputSchema: {
      type: 'array',
      items: {
        type: 'object', description: 'Represents a chat completion response returned by model, based on the provided input.',
        required: ['choices', 'created', 'id', 'model', 'object'],
        properties: {
          id: { type: 'string', description: 'A unique identifier for the chat completion.' },
          created: { type: 'integer', description: 'The Unix timestamp (in seconds) of when the chat completion was created.' },
          model: { type: 'string', description: 'The model used for the chat completion.' },
          object: { type: 'string', enum: ['chat.completion'], description: 'The object type, which is always `chat.completion`.' },
          service_tier: { type: ['string', 'null'], enum: ['scale', 'default', null], description: 'The service tier used for processing the request, when specified in the request.' },
          system_fingerprint: { type: 'string', description: 'Represents the backend configuration that the model runs with.' },
          choices: {
            type: 'array', description: 'A list of chat completion choices. Can be more than one if `n` is greater than 1.',
            items: {
              type: 'object', required: ['finish_reason', 'index', 'message', 'logprobs'],
              properties: {
                finish_reason: { type: 'string', enum: ['stop', 'length', 'tool_calls', 'content_filter', 'function_call'], description: 'The reason the model stopped generating tokens.' },
                index: { type: 'integer', description: 'The index of the choice in the list of choices.' },
                message: {
                  type: 'object', description: 'A chat completion message generated by the model.', required: ['role', 'content', 'refusal'],
                  properties: {
                    content: { type: ['string', 'null'], description: 'The contents of the message.' },
                    refusal: { type: ['string', 'null'], description: 'The refusal message generated by the model.' },
                    role: { type: 'string', enum: ['assistant'], description: 'The role of the author of this message.' },
                  },
                },
                logprobs: { type: ['object', 'null'], description: 'Log probability information for the choice.' },
              },
            },
          },
          usage: {
            type: 'object', description: 'Usage statistics for the completion request.', required: ['prompt_tokens', 'completion_tokens', 'total_tokens'],
            properties: {
              prompt_tokens: { type: 'integer', description: 'Number of tokens in the prompt.' },
              completion_tokens: { type: 'integer', description: 'Number of tokens in the generated completion.' },
              total_tokens: { type: 'integer', description: 'Total number of tokens used in the request (prompt + completion).' },
            },
          },
        },
      },
    },
  },
};
