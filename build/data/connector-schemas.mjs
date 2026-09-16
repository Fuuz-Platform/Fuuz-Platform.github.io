/* build/data/connector-schemas.mjs — raw JSON Schema per connector, queried live from the
 * `Connector` model on the fuuz-administration tenant (system_query_model, 2026-09-16). Same
 * point-in-time-snapshot tradeoff as connector-docs.mjs: not reachable from the public Actions
 * runner, re-sync by hand against the live tenant when a connector's schema changes.
 *
 * All 47 native connectors. `optionsSchema` is queried too but deliberately not stored here —
 * the schema explorer only shows input/output (matching the private connector-catalog
 * accelerator's own scope), and several connectors' options schemas are large enough (FTP's SSH
 * cipher suite lists, FedEx's shipping label defaults) that keeping them serves no page.
 *
 * To add a new connector or re-sync an existing one: query `Connector { name inputSchema
 * outputSchema }` on any live tenant's Fuuz MCP and transcribe the same shape below, keyed by
 * the display name used in it-connectors.mjs's NAMED array (not always the platform's own
 * `name` — e.g. `NetsuiteREST` here is `NetSuite REST`, `AmazonSPAPI` is `Amazon SPAPI`).
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

  'ADP': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of ADP Workforce Now API requests.',
      items: { type: 'object', description: 'A single ADP API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'ADP API path appended to the connection URL.' },
          params: { type: 'object', description: 'Query string parameters.' },
          data: { type: 'object', description: 'Request body.' },
          options: { type: 'object', description: 'Per-request options controlling ADP headers.', properties: {
            masked: { type: 'boolean', description: 'When true, ADP masks sensitive fields (SSN, etc.) in the response. Defaults to `true`.' },
            roleCode: { type: 'string', enum: ['employee', 'manager', 'practitioner', 'administrator', 'supervisor'], description: "ADP role code sent in the `roleCode` header. Controls the caller's visibility scope." },
          } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'ADP Vista': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of ADP Vista API requests. Connection options (country, paymentUnit, legalEntity) are sent as request headers. `data` is always required and must be an array of objects.',
      items: { type: 'object', description: 'A single ADP Vista API request.', required: ['method', 'path', 'data'],
        properties: {
          method: { type: 'string', enum: ['get', 'post'], description: 'HTTP method (lowercase). Only `get` and `post` are supported.' },
          path: { type: 'string', description: 'ADP Vista API path.' },
          data: { type: 'array', items: { type: 'object' }, description: 'Request body. Always required, always an array of objects.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'Amazon Data Firehose': {
    inputSchema: {
      type: 'array', minItems: 1,
      items: { type: 'object', required: ['action', 'body'],
        properties: {
          action: { type: 'string', enum: ['PutRecordCommand', 'PutRecordBatchCommand'] },
          region: { type: 'string' },
          body: { type: 'object', required: ['DeliveryStreamName'],
            properties: {
              DeliveryStreamName: { type: 'string' },
              Record: { type: 'object', required: ['Data'], properties: { Data: {} } },
              Records: { type: 'array', minItems: 1, maxItems: 500, items: { type: 'object', required: ['Data'], properties: { Data: {} } } },
            } },
        },
        oneOf: [
          { type: 'object', properties: { action: { enum: ['PutRecordCommand'] } }, required: ['Record'] },
          { type: 'object', properties: { action: { enum: ['PutRecordBatchCommand'] } }, required: ['Records'] },
        ] },
    },
    outputSchema: {
      type: 'array',
      items: { type: 'object', required: ['results', 'errors'],
        properties: {
          results: { type: ['object', 'array', 'string', 'number', 'null'] },
          errors: { type: 'array', items: { type: 'object' } },
        } },
    },
  },

  'Amazon SPAPI': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Amazon Selling Partner API operations. Each item returns `{ Results, Errors }`.',
      items: { type: 'object', description: 'A single SP-API operation. `data` shape depends on `action`.', required: ['action'],
        properties: {
          action: { type: 'string', enum: ['callAPI', 'download', 'upload'], description: '`callAPI` runs a generic SP-API call; `download` fetches a report document; `upload` submits a feed.' },
          data: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Action-specific payload. See the `oneOf` branches for the required shape per action.' },
        },
        oneOf: [
          { type: 'object', description: '`callAPI` branch: `data` is passed through to `AWSClient.callAPI(data)`.', properties: { action: { enum: ['callAPI'] } }, required: ['data'] },
          { type: 'object', description: '`download` branch: fetches a report document.', properties: { action: { enum: ['download'] },
            data: { type: 'object', description: 'Download payload: `{ report_document, options? }`.', required: ['report_document'], properties: { report_document: { type: 'object', description: 'Report document descriptor returned by SP-API (contains URL and compression info).' } } } }, required: ['data'] },
          { type: 'object', description: '`upload` branch: submits a feed.', properties: { action: { enum: ['upload'] },
            data: { type: 'object', description: 'Upload payload: `{ feed_upload_details, feed }`.', required: ['feed_upload_details', 'feed'], properties: {
              feed_upload_details: { type: 'object', description: "Upload destination returned by SP-API `createFeedDocument`." },
              feed: { type: 'object', description: 'Feed content to upload.' },
            } } }, required: ['data'] },
        ] },
    },
    outputSchema: { type: ['object', 'array', 'string', 'number', 'null'] },
  },

  'Arena': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Arena PLM REST API requests. Session token is obtained from connection credentials and sent as the `arena_session_id` header.',
      items: { type: 'object', description: 'A single Arena API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Arena API path appended to the connection URL.' },
          data: { type: 'object', description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'AWS Lambda': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of AWS Lambda SDK command invocations. Each item returns `{ results, errors }`. For `InvokeCommand`, the response `Payload` is decoded from Uint8Array back to JSON.',
      items: { type: 'object', description: 'A single Lambda SDK command execution.', required: ['action'],
        properties: {
          action: { type: 'string', description: 'Lambda SDK command name (e.g. `InvokeCommand`, `ListFunctionsCommand`).' },
          region: { type: 'string', description: 'AWS region for this call. Defaults to `us-east-1`.' },
          body: { type: 'object', description: 'Input passed to the SDK command constructor. Fields shown here apply to `InvokeCommand`.',
            properties: {
              FunctionName: { type: 'string', description: 'Lambda function name, qualified ARN, or partial ARN.' },
              Payload: { description: 'Payload passed to the function. Automatically JSON-stringified and encoded to binary.' },
              InvocationType: { type: 'string', description: '`RequestResponse` (default), `Event` (async fire-and-forget), or `DryRun`.' },
              LogType: { type: 'string', description: '`None` or `Tail`. `Tail` returns the last 4 KB of log output in the response.' },
              ClientContext: { type: 'string', description: 'Base64-encoded client context data provided to the function.' },
              Qualifier: { type: 'string', description: 'Function version or alias to invoke.' },
            } },
        } },
    },
    outputSchema: { type: 'array', items: { type: 'object', required: ['results', 'errors'], properties: { results: { type: ['object', 'array', 'string', 'number', 'null'] }, errors: { type: 'array', items: { type: 'object' } } } } },
  },

  'C. H. Robinson': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of C.H. Robinson (Navisphere) REST API requests.',
      items: { type: 'object', description: 'A single C.H. Robinson API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'C.H. Robinson API path appended to the connection URL.' },
          data: { oneOf: [{ type: 'object' }], description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Channel Advisor': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of ChannelAdvisor REST API requests.',
      items: { type: 'object', description: 'A single ChannelAdvisor API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'ChannelAdvisor API path appended to the connection URL.' },
          data: { oneOf: [{ type: 'object' }], description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Clover': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Clover REST API requests. `filters`, `expand`, `limit`, and `orderBy` are serialized into Clover query parameters.',
      items: { type: 'object', description: 'A single Clover API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Clover API path appended to the connection URL.' },
          filters: { type: 'array', minItems: 0, description: 'Clover filter clauses. Each filter is serialized to a `field<op>value` query parameter.',
            items: { type: 'object', description: 'A single Clover filter clause.', required: ['field', 'value', 'condition_type'], properties: {
              field: { type: 'string', description: 'Field name to filter on.' },
              value: { type: 'string', description: 'Filter value.' },
              condition_type: { type: 'string', enum: ['==', '!=', '>', '<', '>=', '<='], description: 'Comparison operator.' },
            } } },
          expand: { type: 'array', minItems: 0, description: 'Related entities to expand in the response (passed as comma-separated `expand=` query parameter).', items: { type: 'string' } },
          limit: { type: 'string', description: 'Result limit. Defaults to `"100"`.' },
          orderBy: { type: 'string', description: 'Field to sort results by.' },
          data: { type: 'object', description: 'Request body for write operations.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'Confluence': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Confluence REST API requests. Authenticated via Basic auth with `email:apiKey`.',
      items: { type: 'object', description: 'A single Confluence API request.', required: ['method', 'path'],
        properties: {
          options: { type: 'object', description: 'Per-request options.', properties: { returnHeaders: { type: 'boolean', description: 'When true, returns the response body alongside response headers.' } } },
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Confluence API path appended to the connection URL (e.g. `/wiki/rest/api/content`).' },
          headers: { type: 'object', description: 'Additional request headers merged with the default `Content-Type` and `Authorization`.' },
          responseType: { type: 'string', enum: ['binary', 'json', 'text'], description: 'Expected response format. `binary` returns base64.' },
          body: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Request body for write operations.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Dynamics 365': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Dynamics 365 REST API requests. Each item returns `{ body, errors }`.',
      items: { type: 'object', description: 'A single Dynamics 365 API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'], description: 'HTTP method (UPPERCASE).' },
          headers: { type: 'object', description: 'Additional request headers.' },
          path: { type: 'string', description: 'Dynamics 365 API path appended to the connection URL.' },
          body: { type: ['object', 'array', 'boolean', 'null', 'string', 'number'], description: 'Request body. Accepts any JSON type.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'EDI Nation': {
    inputSchema: {
      type: 'array', minItems: 0, description: 'Array of EDI Nation operations. `read` parses EDI file contents; `write`/`ack`/`validate` act on EDI data objects.',
      items: { anyOf: [
        { type: 'object', description: 'Read branch: parse raw EDI file contents into a structured object.', required: ['format', 'action', 'data'],
          properties: {
            format: { type: 'string', enum: ['x12', 'edifact'], description: 'EDI standard.' },
            action: { type: 'string', enum: ['read'], description: 'Must be `read`.' },
            data: { type: 'object', description: 'File payload to parse.', required: ['fileContents'], properties: {
              fileName: { type: 'string', description: 'Optional original file name (informational).' },
              fileContents: { type: 'string', description: 'Raw EDI file contents to parse.' },
            } },
            options: { type: 'object', description: 'Per-request options.', properties: { apiOptions: { type: 'object', description: 'Additional options forwarded to the EDI Nation API.' } } },
          } },
        { type: 'object', description: 'Write / acknowledge / validate branch: acts on a structured EDI data object.', required: ['format', 'action', 'data'],
          properties: {
            format: { type: 'string', enum: ['x12', 'edifact'], description: 'EDI standard.' },
            action: { type: 'string', enum: ['write', 'ack', 'validate'], description: '`write` serializes to EDI; `ack` generates a functional acknowledgement; `validate` checks EDI validity.' },
            data: { description: 'Structured EDI data object. Shape depends on the transaction set.' },
            options: { type: 'object', description: 'Per-request options.', properties: { apiOptions: { type: 'object', description: 'Additional options forwarded to the EDI Nation API.' } } },
          } },
      ] },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Fanuc ZDT Data API': {
    inputSchema: {
      type: 'array', minItems: 1,
      items: { type: 'object', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'post', 'put', 'delete'] },
          path: { type: 'string', description: 'The URL path for the ZDT API endpoint (e.g., "/dataapi/v3/robots").' },
          parameters: { type: 'object', description: 'An object that is converted to url querystring parameters' },
          data: { type: 'object', description: 'Request body for POST/PUT requests' },
          headers: { type: 'object', description: 'Additional request headers' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'FedEx': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of FedEx SOAP API calls. Each call is posted as `Content-Type: text/xml` and the response is parsed from XML to JSON.',
      items: { type: 'object', description: 'A single FedEx SOAP call.', required: ['action'],
        properties: {
          action: { type: 'string', enum: ['Address Validation', 'Rates', 'Shipping Validation', 'Shipment Create', 'Shipment Delete', 'POST'], description: 'FedEx action. Selects the SOAP template and endpoint. `POST` sends `data` as-is without wrapping.' },
          data: { type: ['string', 'object'], description: 'XML body (string) or data object merged into the SOAP template. For `POST`, raw data is sent unchanged.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'FedEx REST': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of FedEx REST API requests. Each item returns `{ body, errors }`.',
      items: { type: 'object', description: 'A single FedEx REST API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'post', 'put', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'FedEx API path appended to the connection URL.' },
          data: { type: 'object', description: 'Request body for POST/PUT requests.' },
          headers: { type: 'object', description: 'Additional request headers merged over the default `Content-Type` and `Authorization`.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'FTP': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of FTP/FTPS/SFTP file operations. Protocol is chosen from the connection options. Required fields depend on `action` (enforced via `oneOf`).',
      items: { type: 'object', description: 'A single file operation.', required: ['action'],
        properties: {
          file: { type: 'string', description: 'Remote file path. Required for `get`, `post`, `put`, `delete`, `move`.' },
          action: { type: 'string', enum: ['get', 'getAllInDir', 'post', 'delete', 'move', 'list', 'put'], description: 'File operation to perform.' },
          data: { type: 'string', description: 'File content to write. Required for `post` and `put`.' },
          destination: { type: 'string', description: 'Destination path. Required for `move` (target) and `getAllInDir` (directory to download).' },
          options: { type: 'object', description: 'Per-operation options.', properties: {
            limit: { type: 'number', description: 'Maximum number of files to return from `list`.' },
            first: { type: 'number', description: 'Return the first N files from `list`.' },
            last: { type: 'number', description: 'Return the last N files from `list`.' },
            match: { type: 'string', description: 'Regex pattern to filter file names in `list`.' },
            encoding: { type: 'string', description: 'File encoding (`utf8`, `base64`, `binary`, `hex`, `ascii`).' },
            createDirs: { type: 'boolean', description: 'Create parent directories if missing.' },
          } },
        },
        oneOf: [
          { required: ['data', 'file'], properties: { action: { enum: ['put'] } } },
          { required: ['data', 'file'], properties: { action: { enum: ['post'] } } },
          { required: ['file'], properties: { action: { enum: ['get'] } } },
          { required: ['destination'], properties: { action: { enum: ['getAllInDir'] } } },
          { required: ['file', 'destination'], properties: { action: { enum: ['move'] } } },
          { required: ['file'], properties: { action: { enum: ['delete'] } } },
          { properties: { action: { enum: ['list'] } } },
        ] },
    },
    outputSchema: { type: 'array', minItems: 1, items: { type: 'object' } },
  },

  'Fuuz': {
    inputSchema: {
      type: 'array', minItems: 1, maxItems: 100, description: 'Array of calls to an external Fuuz instance. Max 100 items per request.',
      items: { anyOf: [
        { type: 'object', description: 'Execute a GraphQL query.', required: ['query', 'api', 'action'], properties: {
          action: { enum: ['query'], description: 'Must be `query`.' }, query: { type: 'string', description: 'GraphQL query document.' },
          api: { enum: ['application', 'system'], description: 'Which Fuuz API to target: `application` (tenant) or `system` (platform).' }, variables: { type: 'object', description: 'GraphQL variables.' },
        } },
        { type: 'object', description: 'Execute a GraphQL mutation.', required: ['mutation', 'api', 'action'], properties: {
          action: { enum: ['mutation'], description: 'Must be `mutation`.' }, mutation: { type: 'string', description: 'GraphQL mutation document.' },
          api: { enum: ['application', 'system'], description: 'Which Fuuz API to target.' }, variables: { type: 'object', description: 'GraphQL variables.' },
        } },
        { type: 'object', description: 'Execute a Fuuz data flow by ID.', required: ['flowId', 'action'], properties: {
          flowId: { type: 'string', description: 'ID of the flow to execute on the target Fuuz instance.' }, action: { enum: ['flow'], description: 'Must be `flow`.' }, payload: { type: 'object', description: 'Payload passed to the flow.' },
        } },
        { type: 'object', description: 'Execute a saved GraphQL query by ID.', required: ['savedQueryId', 'action'], properties: {
          savedQueryId: { type: 'string', description: 'ID of the saved query on the target Fuuz instance.' }, action: { enum: ['savedQuery'], description: 'Must be `savedQuery`.' }, variables: { type: 'object', description: 'Variables passed to the saved query.' },
        } },
        { type: 'object', description: 'Execute a saved script by ID.', required: ['savedScriptId', 'action'], properties: {
          savedScriptId: { type: 'string', description: 'ID of the saved script on the target Fuuz instance.' }, action: { enum: ['savedScript'], description: 'Must be `savedScript`.' }, payload: { type: 'object', description: 'Payload passed to the script.' },
        } },
        { type: 'object', description: 'Publish messages to a Fuuz topic.', required: ['topicName', 'topicMessages', 'action'], properties: {
          action: { enum: ['publish'], description: 'Must be `publish`.' }, topicName: { type: 'string', description: 'Name of the target topic on the remote Fuuz instance.' },
          topicMessages: { type: 'array', description: 'Messages to publish, one per array item.', items: { type: 'object', description: 'A single message envelope.', required: ['value'], properties: { value: { description: 'Message payload (any JSON-serializable value).' } } } },
        } },
      ] },
    },
    outputSchema: { type: 'array', minItems: 0, items: {} },
  },

  'Fuuz UPS': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Fuuz-managed UPS requests. Credentials are sourced from server config. Includes license-management actions in addition to generic HTTP.',
      items: { type: 'object', description: 'A single UPS request.', required: ['action'],
        properties: {
          version: { type: 'string', enum: ['v1'], description: 'UPS API version. Only `v1` is supported.' },
          action: { type: 'string', enum: ['GET', 'POST', 'DELETE', 'License Agreement', 'License Request'], description: 'Generic HTTP method or a license-management action (`License Agreement`, `License Request`).' },
          path: { type: 'string', description: 'UPS API path. Used for generic HTTP actions.' },
          data: { type: 'object', description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Google API': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Google API calls dispatched via the `googleapis` client. Each call resolves to `google[api]({ version, auth })[resource][action](body, options)`.',
      items: { type: 'object', description: 'A single Google API call.', required: ['api', 'resource', 'action'],
        properties: {
          api: { type: 'string', description: 'Google API name (e.g. `drive`, `bigquery`, `sheets`).' },
          resource: { type: 'string', description: 'API resource (e.g. `files`, `datasets`, `spreadsheets`).' },
          action: { type: 'string', description: 'Resource method (e.g. `create`, `get`, `list`, `delete`).' },
          body: { type: 'object', description: 'Request options passed as the first positional argument to the method.', properties: {
            requestBody: { type: 'object', description: 'Resource payload for insert/update operations.' },
            media: { type: 'object', description: 'Media upload payload. When `api=drive`, `resource=files`, `action=create`, the base64 `body` is streamed as the file content.', required: ['body', 'mimeType'], properties: {
              body: { type: 'string', description: 'Base64-encoded file content.' }, mimeType: { type: 'string', description: 'MIME type of the uploaded content.' },
            } },
            resource: { type: 'object', description: 'Resource metadata (file name, parents, etc. for Drive; dataset/table config for BigQuery).' },
          } },
          options: { type: 'object', description: 'Additional request options passed as the second argument (e.g. `timeout`, per-call auth overrides).' },
        } },
    },
    outputSchema: { type: 'array', minItems: 1, items: { type: 'object' } },
  },

  'Infor': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Infor ION API requests. Responses are inspected for Infor-specific error fields (`cErrorMessage`, `errorMessage`).',
      items: { type: 'object', description: 'A single Infor API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Infor API path appended to the connection URL.' },
          data: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Körber PAS-X MSI': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'MSI messages to publish to PAS-X (SF_TO_MES). Each item is `{ data, options }` and returns `{ body, errors }`.',
      items: { type: 'object', required: ['data'],
        properties: {
          data: { type: 'object', description: 'The MSI message to publish. Provide `message` (object → built to XML, or string → raw inner XML), or `xmlOverride` for a complete raw MsiMessageContainer.', properties: {
            messageType: { type: 'string', description: 'MSI message type, e.g. `MsiOrderStatusMessage`. Also used as the inner element name when `message` is an object.' },
            message: { type: ['object', 'string'], description: "Inner message. Object → built to XML and nested under `messageType`. String → used as raw inner XML verbatim." },
            xmlOverride: { type: 'string', description: 'Complete MsiMessageContainer XML string. When provided, all other `data` fields are ignored and it is sent as-is.' },
            systemId: { type: 'string', description: 'System ID addressing the partner. Overrides the connection-level `systemId` option.' },
            messageContext: { type: 'string', description: 'Optional context echoed back by PAS-X on the response.' },
            messageInstanceId: { type: 'string', description: 'Optional GUID for duplicate detection. Auto-generated when omitted.' },
          } },
          options: { type: 'object', description: 'Per-request controls.', properties: {
            path: { type: 'string', description: 'Path appended to the connection URL. Overrides the connection-level `messagePath` option.' },
            headers: { type: 'object', description: 'Additional request headers merged over the defaults (`Content-Type`, `Accept`, `Authorization`).' },
          } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Magento': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Magento REST API requests. `filters` and `pagination` are serialized into Magento `searchCriteria[...]` query parameters.',
      items: { type: 'object', description: 'A single Magento API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Magento API path appended to the connection URL.' },
          filters: { type: 'array', minItems: 0, description: 'Magento searchCriteria filter groups. See Magento REST search docs.',
            items: { type: 'object', description: 'A single filter clause (`field` `condition_type` `value`).', properties: {
              field: { type: 'string', description: 'Field name to filter on.' }, value: { type: 'string', description: 'Filter value.' },
              condition_type: { type: 'string', enum: ['eq', 'finset', 'from', 'gt', 'gteq', 'in', 'like', 'lt', 'lteq', 'moreq', 'neq', 'nin', 'notnull', 'null', 'to'], description: 'Magento comparison operator.' },
            } } },
          pagination: { type: 'object', description: 'Magento pagination and sorting options.', properties: {
            currentPage: { type: 'integer', description: 'Page number to fetch (1-based).' }, pageSize: { type: 'integer', description: 'Number of records per page.' },
            sortOrders: { type: 'array', minItems: 0, description: 'Ordered list of sort specifications applied to the result set.', items: { type: 'object', description: 'A single sort specification.', properties: { direction: { type: 'string', description: 'Sort direction (e.g. `ASC`, `DESC`).' }, field: { type: 'string', description: 'Field to sort by.' } } } },
          } },
          data: { oneOf: [{ type: 'object' }, { type: 'array', minItems: 0, items: { type: 'object' } }], description: 'Request body. Accepts an object or array of objects.' },
          options: { type: 'object', description: 'Per-request options.', properties: { returnErrors: { type: 'boolean', description: 'When true, failed requests return an error object instead of aborting the batch.' } } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'MFGx': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of GraphQL calls to a legacy MFGx instance.',
      items: { type: 'object', description: 'A single GraphQL call dispatched through `MFGxAPIKeyClient.graphQL`.', required: ['query', 'api'],
        properties: {
          query: { type: 'string', description: 'GraphQL query or mutation document.' },
          api: { type: 'string', description: 'Target API name (e.g. `application`, `system`). Resolved to the API constant via `APIS[api.toUpperCase()]`.' },
          variables: { type: 'object', description: 'GraphQL variables.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'Microsoft SQL Server': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of SQL Server queries or stored procedure calls. Executed sequentially against a pooled connection. Each item returns `{ resultSets, output, rowsAffected }`.',
      items: { type: 'object', description: 'A single SQL Server query or stored procedure execution.', required: ['query'],
        properties: {
          query: { type: 'string', description: 'SQL query text, or stored procedure name when `procedure: true`.' },
          parameters: { type: 'array', description: "Typed SQL parameters bound to the query or procedure. Each parameter picks one of four variants based on its `dataType` sizing requirements.",
            items: { oneOf: [
              { type: 'object', description: 'Parameter for data types that take no sizing.', required: ['name', 'dataType'], properties: {
                name: { type: 'string', description: 'Parameter name (referenced in the SQL as `@name`).' },
                dataType: { type: 'string', enum: ['BigInt', 'Bit', 'Date', 'DateTime', 'Int', 'Float', 'Money', 'NText', 'Real', 'SmallDateTime', 'SmallInt', 'SmallMoney', 'Text', 'TinyInt', 'UniqueIdentifier', 'Xml'], description: 'SQL Server data type (no sizing required).' },
                value: { description: 'Parameter value. Null when omitted.' }, output: { type: 'boolean', description: 'When true, register this as an output parameter (returned in `output`).' },
              } },
              { type: 'object', description: 'Parameter for character data types (takes `length`).', required: ['name', 'dataType'], properties: {
                name: { type: 'string', description: 'Parameter name.' }, dataType: { type: 'string', enum: ['Char', 'NChar', 'NVarChar', 'VarChar'], description: 'Character data type. Requires `length`.' },
                value: { description: 'Parameter value.' }, output: { type: 'boolean', description: 'When true, register as an output parameter.' }, length: { type: 'integer', description: 'Character length for the column.' },
              } },
              { type: 'object', description: 'Parameter for time-based data types (takes `scale`).', required: ['name', 'dataType'], properties: {
                name: { type: 'string', description: 'Parameter name.' }, dataType: { type: 'string', enum: ['DateTime2', 'DateTimeOffset', 'Time'], description: 'Time-based data type. Requires `scale`.' },
                value: { description: 'Parameter value.' }, output: { type: 'boolean', description: 'When true, register as an output parameter.' }, scale: { type: 'integer', description: 'Fractional-second precision (0–7).' },
              } },
              { type: 'object', description: 'Parameter for fixed-point numeric data types (takes `precision` + `scale`).', required: ['name', 'dataType'], properties: {
                name: { type: 'string', description: 'Parameter name.' }, dataType: { type: 'string', enum: ['Decimal', 'Numeric'], description: 'Fixed-point numeric data type. Requires `precision` and `scale`.' },
                value: { description: 'Parameter value.' }, output: { type: 'boolean', description: 'When true, register as an output parameter.' }, scale: { type: 'integer', description: 'Number of digits to the right of the decimal point.' }, precision: { type: 'integer', description: 'Total number of digits stored.' },
              } },
            ] } },
          options: { type: 'object', description: 'Per-request options.', properties: { retry: { type: 'object', description: 'Retry config for transient errors. Non-retryable errors (containing "syntax", "invalid", "permission") abort immediately.', properties: {
            retries: { type: 'integer', description: 'Maximum retry attempts. Defaults to 0 (no retry).' }, factor: { type: 'integer', description: 'Exponential backoff factor. Defaults to 2.' }, minTimeout: { type: 'integer', description: 'Minimum delay between retries in milliseconds. Defaults to 100.' },
          } } } },
          procedure: { type: 'boolean', description: 'When true, execute `query` as a stored procedure via `request.execute()` instead of a raw SQL query.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'NetSuite REST': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of NetSuite REST/SuiteQL requests. Uses `endpoint`/`action` instead of the common `path`/`method`. Each item returns `{ headers, data, error }`.',
      items: { type: 'object', description: 'A single NetSuite REST request.', required: ['endpoint', 'action'],
        properties: {
          endpoint: { type: 'string', description: 'NetSuite API path appended to the connection URL (used in place of `path`).' },
          action: { type: 'string', description: 'HTTP method (e.g. `GET`, `POST`). Used in place of `method`.' },
          headers: { type: 'object', description: 'Additional request headers.' },
          parameters: { type: 'object', description: 'Query string parameters.' },
          body: { oneOf: [{ type: 'object' }, { type: 'array' }, { type: 'string' }], description: 'Request body. Accepts object, array, or raw string.' },
        } },
    },
    outputSchema: {},
  },

  'NetSuite SOAP': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of NetSuite SOAP API calls. Each item returns `{ data: { headers, body }, error }`.',
      items: { type: 'object', description: 'A single NetSuite SOAP operation.', required: ['action', 'requestBody'],
        properties: {
          action: { type: 'string', enum: ['loginasd', 'ssoLogin', 'mapSso', 'changePassword', 'changeEmail', 'logout', 'add', 'delete', 'search', 'searchMore', 'searchMoreWithId', 'searchNext', 'update', 'upsert', 'addList', 'deleteList', 'updateList', 'upsertList', 'get', 'getList', 'getAll', 'getSavedSearch', 'getCustomizationId', 'initialize', 'initializeList', 'getSelectValue', 'getItemAvailability', 'getBudgetExchangeRate', 'getCurrencyRate', 'getDataCenterUrls', 'getPostingTransactionSummary', 'getServerTime', 'attach', 'detach', 'updateInviteeStatus', 'updateInviteeStatusList', 'asyncAddList', 'asyncUpdateList', 'asyncUpsertList', 'asyncDeleteList', 'asyncGetList', 'asyncInitializeList', 'asyncSearch', 'getAsyncResult', 'checkAsyncStatus', 'getDeleted'], description: 'NetSuite SuiteTalk SOAP operation name. Determines the `SOAPAction` header and the wrapping envelope.' },
          requestBody: { type: 'string', description: 'XML body content inserted inside the SOAP envelope (not the full envelope; the connector wraps it).' },
          options: { type: 'object', description: 'Per-request options.', properties: { returnXML: { type: 'boolean', description: 'When true, return the raw XML response string instead of parsing it to JSON.' } } },
        } },
    },
    outputSchema: {},
  },

  'ODBC': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of ODBC queries. Executed in a worker pool using the driver configured on the connection (e.g. Plex, NetSuite).',
      items: { type: 'object', description: 'A single ODBC query.', required: ['query'],
        properties: {
          query: { type: 'string', description: 'SQL query. Uses `?` placeholders for bind variables.' },
          variables: { type: 'array', description: 'Positional bind variables substituted into each `?` placeholder in order.' },
          options: { type: 'object', description: 'Per-request options.', properties: { retry: { type: 'object', description: 'Retry config applied per query via `p-retry`.', properties: {
            retries: { type: 'integer', description: 'Maximum retry attempts.' }, factor: { type: 'integer', description: 'Exponential backoff factor.' }, minTimeout: { type: 'integer', description: 'Minimum delay between retries in milliseconds.' },
          } } } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'Plex API': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Plex Connect API requests. Tenant ID is sent as the `X-Plex-Connect-Tenant-Id` header (from the connection or the per-request override).',
      items: { type: 'object', description: 'A single Plex Connect API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'patch', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Plex Connect API path appended to the connection URL.' },
          params: { type: 'object', description: 'Query string parameters.' },
          tenantId: { type: 'string', description: 'Overrides the connection-level tenant ID for this request.' },
          body: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Plex Classic': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Plex Classic datasource executions via SOAP. Each item returns `{ Parameters, Rows, Errors }`.',
      items: { type: 'object', description: 'A single Plex datasource execution.', required: ['datasourceKey', 'parameters'],
        properties: {
          datasourceKey: { type: 'integer', description: 'Plex datasource key identifying the stored procedure to execute.' },
          datasourceName: { type: 'string', description: 'Optional datasource name included as the XML element name.' },
          parameters: { type: 'object', description: 'Input parameters for the datasource. Keys map to Plex `@`-prefixed parameter names (without the `@`). `undefined` values are omitted.' },
          options: { type: 'object', description: 'Per-request options.', properties: { pagination: { type: 'object', description: 'Pagination config. Either key-based (`keyColumn` + `keyParameter` + `rowLimit`) or offset-based (`offsetPagination: true` + `rowLimit`).', properties: {
            keyColumn: { type: 'string', description: 'Result column whose value is used as the cursor for the next page.' }, keyParameter: { type: 'string', description: 'Datasource parameter name to receive the cursor value.' },
            rowLimit: { type: 'integer', minimum: 1, description: 'Rows per page. Injected as the Plex `Top_N` parameter (key-based) or `Limit` parameter (offset-based).' },
            offsetPagination: { type: 'boolean', default: false, description: 'When true, use offset pagination via the `Limit`/`Offset` Plex parameters.' },
            initialOffset: { type: 'integer', default: 0, minimum: 0, description: 'Starting offset for offset pagination. Defaults to 0.' },
            maxPages: { type: 'integer', minimum: 1, description: 'Maximum pages to fetch before stopping (default 500). Key-based pagination throws; offset pagination stops silently.' },
          } } } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object', properties: {
      Parameters: { type: 'object' }, Rows: { type: 'array', minItems: 0, items: { type: 'object' } },
      Errors: { type: 'array', minItems: 0, items: { type: 'object', required: ['request', 'message', 'statusCode'], properties: { request: { type: 'object' }, message: { type: 'string' }, statusCode: { type: 'integer' } } } },
    } } },
  },

  'Plex IAM API': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Plex IAM API requests. Each item returns `{ body, errors }`.',
      items: { type: 'object', description: 'A single Plex IAM API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'patch', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Plex IAM API path appended to the connection URL.' },
          params: { type: 'object', description: 'Query string parameters.' },
          body: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Plex UX': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Plex UX (JSON REST) requests. Each item is either an Execute-mode datasource call or a GET-mode metadata/search call. Responses return `{ Parameters, Rows, Errors }`.',
      items: { anyOf: [
        { type: 'object', description: 'Execute mode: runs a Plex datasource via POST `/api/datasources/{datasourceKey}/execute`.', required: ['datasourceKey', 'parameters'], properties: {
          datasourceKey: { type: 'integer', description: 'Plex datasource key.' }, datasourceName: { type: 'string', description: 'Optional datasource name (informational).' },
          parameters: { type: 'object', description: 'Input parameters sent as `{ inputs: parameters }` in the request body.' },
          options: { type: 'object', description: 'Per-request options.', properties: { pagination: { type: 'object', description: 'Pagination config. Either key-based (`keyColumn` + `keyParameter` + `rowLimit`) or offset-based (`offsetPagination: true` + `rowLimit`).', properties: {
            keyColumn: { type: 'string', description: 'Result column whose value is used as the cursor for the next page.' }, keyParameter: { type: 'string', description: 'Datasource parameter name to receive the cursor value.' },
            rowLimit: { type: 'integer', minimum: 1, description: 'Rows per page. Injected as the Plex `Top_N` parameter (key-based) or `Limit` parameter (offset-based).' },
            offsetPagination: { type: 'boolean', default: false, description: 'When true, use offset pagination via the `Limit`/`Offset` Plex parameters.' },
            initialOffset: { type: 'integer', default: 0, minimum: 0, description: 'Starting offset for offset pagination. Defaults to 0.' },
            maxPages: { type: 'integer', minimum: 1, description: 'Maximum pages to fetch (default 500). Key-based throws; offset-based stops silently.' },
          } } } },
        } },
        { type: 'object', description: 'GET mode: fetches datasource metadata via `/api/datasources/{key}` or search via `/api/datasources/search?name=...`. No pagination in this mode.', required: ['method'], properties: {
          method: { type: 'string', enum: ['get', 'GET'], description: 'Must be `"get"` or `"GET"` to select this mode.' },
          parameters: { type: 'object', description: 'Exactly one of `datasourceKey` (lookup by key) or `datasourceName` (search by name) should be set.', properties: {
            datasourceKey: { type: 'integer', description: 'Fetch the datasource with this key.' }, datasourceName: { type: 'string', description: 'Search for datasources with this name.' },
          } },
        } },
      ] },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object', properties: {
      Parameters: { type: 'object' }, Rows: { type: 'array', minItems: 0, items: { type: 'object' } },
      Errors: { type: 'array', minItems: 0, items: { type: 'object', required: ['request', 'message', 'statusCode'], properties: { request: { type: 'object' }, message: { type: 'string' }, statusCode: { type: 'integer' }, info: { type: ['array', 'object'] } } } },
    } } },
  },

  'QuickBooks': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of QuickBooks Online REST API requests.',
      items: { type: 'object', description: 'A single QuickBooks Online API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'patch', 'delete'], description: 'HTTP method (lowercase).' },
          headers: { type: 'object', description: 'Additional request headers.' },
          path: { type: 'string', description: 'QuickBooks API path (e.g. `/v3/company/{realmId}/query`).' },
          params: { type: 'object', description: 'Query string parameters.' },
          body: { type: ['object', 'array', 'string', 'number', 'null'], description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'SAP Cloud (S/4HANA)': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of SAP Cloud (OData) API requests. The OData options (`top`, `skip`, `filter`, etc.) are serialized to `$`-prefixed query parameters.',
      items: { type: 'object', description: 'A single SAP Cloud API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'SAP Cloud API path appended to the connection URL.' },
          top: { type: 'string', description: 'OData `$top`. Maximum number of records to return.' },
          skip: { type: 'string', description: 'OData `$skip`. Number of records to skip (offset pagination).' },
          filter: { type: 'string', description: 'OData `$filter` expression.' },
          inlinecount: { type: 'string', enum: ['', 'allpages', 'none'], description: 'OData `$inlinecount`. Include total count in the response.' },
          orderby: { type: 'string', description: 'OData `$orderby` sort expression.' },
          select: { type: 'string', description: 'OData `$select`. Comma-separated list of fields to return.' },
          expand: { type: 'string', description: 'OData `$expand`. Related entities to include in the response.' },
          data: { type: 'object', description: 'Request body for write operations.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'SAP Success Factors': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of SAP SuccessFactors REST API requests. Each item returns `{ body, errors }`.',
      items: { type: 'object', description: 'A single SuccessFactors API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'], description: 'HTTP method (UPPERCASE).' },
          headers: { type: 'object', description: 'Additional request headers.' },
          path: { type: 'string', description: 'SuccessFactors API path appended to the connection URL.' },
          body: { type: ['object', 'array', 'boolean', 'null', 'string', 'number'], description: 'Request body. Accepts any JSON type.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'SMTP': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of emails to send over SMTP (via nodemailer). Each message must include either `text` or `html`.',
      items: { type: 'object', description: 'A single email message.',
        properties: {
          from: { type: 'string', description: 'Sender email address (or `"Name <addr@example.com>"`).' },
          to: { type: 'string', description: 'Recipient email address(es). Comma-separated for multiple.' },
          subject: { type: 'string', description: 'Email subject line.' },
          text: { type: 'string', description: 'Plain-text body. Required if `html` is not provided.' },
          html: { type: 'string', description: 'HTML body. Required if `text` is not provided.' },
          attachments: { type: 'array', minItems: 1, description: 'File attachments forwarded to nodemailer.', items: { type: 'object', description: 'A single attachment. Provide content inline (`content`/`raw`) or by reference (`href`).', properties: {
            filename: { type: 'string', description: 'Display name for the attached file.' }, content: { type: 'string', description: 'Inline attachment content (interpret according to `encoding`).' },
            href: { type: 'string', description: 'URL to fetch the attachment content from.' }, httpHeaders: { type: 'object', description: 'HTTP headers used when fetching `href`.' },
            contentType: { type: 'string', enum: ['text/plain', 'application/pdf'], description: 'MIME type of the attachment.' }, contentDisposition: { type: 'string', description: 'Content-Disposition header value (e.g. `inline`, `attachment`).' },
            cid: { type: 'string', description: 'Content-ID for inline attachments referenced in HTML.' }, encoding: { type: 'string', description: 'Encoding of `content` (e.g. `base64`, `utf8`).' },
            headers: { type: 'object', description: 'Additional MIME headers for the attachment part.' }, raw: { type: 'string', description: 'Pre-built raw MIME representation of the attachment.' },
          } } },
        },
        oneOf: [{ required: ['from', 'to', 'subject', 'text'] }, { required: ['from', 'to', 'subject', 'html'] }] },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'Spiro': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Spiro REST API requests. Uses JSON:API content type.',
      items: { type: 'object', description: 'A single Spiro API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Spiro API path appended to the connection URL.' },
          data: { type: 'object', description: 'Request body.' },
          filter: { type: 'string', description: 'Spiro filter query string (sent as the `filter` query parameter).' },
          modifiedSince: { type: 'string', format: 'date-time', description: 'ISO date-time sent as `If-Modified-Since` to return only records updated after this time.' },
          options: { type: 'object', description: 'Per-request options.', properties: {
            returnErrors: { type: 'boolean', description: 'When true, failed requests return an error object instead of aborting the batch.' },
            pages: { type: 'object', description: 'Page-range pagination. When set, the connector loops from `start` to `stop` with `itemsPerPage` records each.', required: ['itemsPerPage'], properties: {
              itemsPerPage: { type: 'integer', minimum: 1, maximum: 500, description: 'Number of records per page (1–500).' },
              start: { type: 'integer', minimum: 1, description: 'First page number to fetch (1-based).' }, stop: { type: 'integer', minimum: 1, description: 'Last page number to fetch.' },
            } },
          } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },

  'Square': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Square REST API requests. Each item returns `{ records, errors, cursor }`.',
      items: { type: 'object', description: 'A single Square API request.', required: ['path', 'method'],
        properties: {
          version: { type: 'string', enum: ['v2'], default: 'v2', description: 'Square API version. Only `v2` is supported.' },
          method: { type: 'string', enum: ['get', 'patch', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Square API path (e.g. `/v2/catalog/list`).' },
          data: { type: 'object', description: 'Request body.' },
          params: { type: 'object', description: 'Query string parameters.' },
          options: { type: 'object', description: 'Per-request options.', properties: { pagination: { type: 'boolean', default: true, description: 'Auto-follow Square cursor-based pagination until exhausted. Defaults to `true`.' } } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object', properties: {
      records: { type: 'array', minItems: 0, items: { type: 'object' } }, errors: { type: 'array', minItems: 0, items: { type: 'object' } }, cursor: { type: 'string' },
    } } },
  },

  'TecCom File Upload': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of TecCom file uploads. Each row array is converted to CSV, zipped, and uploaded to the TecCom file endpoint.',
      items: { type: 'object', description: 'A single TecCom upload: one request mode applied to a batch of typed files.', required: ['requestMode', 'files'],
        properties: {
          requestMode: { type: 'string', enum: ['REPLACE', 'MODIFY'], description: '`REPLACE` overwrites the full dataset; `MODIFY` applies incremental changes.' },
          files: { type: 'array', description: 'Files to include in the upload. Each entry produces one CSV inside the uploaded zip.', items: { type: 'object', description: 'A single typed file.', required: ['fileName', 'data'], properties: {
            fileName: { type: 'string', enum: ['article', 'assortment', 'article_data', 'sales_uom', 'buyer_grouping', 'availability', 'article_description', 'article_buyer', 'alternative', 'condition_group', 'price', 'alc', 'packaging', 'external_document'], description: 'TecCom data file type. Determines the CSV schema.' },
            data: { type: 'array', description: 'Row objects to serialize to CSV.' },
          } } },
        } },
    },
    outputSchema: {},
  },

  'TecCom Web Services': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of TecCom SOAP web service calls. Each item returns `{ Timestamp, Reference, OriginatingFunction, Status }`.',
      items: { type: 'object', description: 'A single TecCom SOAP call.', required: ['functionId', 'parameters'],
        properties: {
          functionId: { type: 'string', description: 'TecCom function identifier (selects the SOAP operation).' },
          parameters: { type: 'object', description: 'Function parameters. Each key/value becomes a SOAP parameter element.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 1, items: { type: 'object', properties: { Timestamp: { type: 'object' }, Reference: { type: 'object' }, OriginatingFunction: { type: 'object' }, Status: { type: 'object' } } } },
  },

  'UPS': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of legacy UPS API requests. Action-based routing selects REST or pre-built shipping flows.',
      items: { type: 'object', description: 'A single UPS legacy API request.', required: ['action'],
        properties: {
          version: { type: 'string', enum: ['v1'], description: 'UPS API version. Only `v1` is supported by this connector.' },
          action: { type: 'string', enum: ['GET', 'POST', 'DELETE', 'Address Validation', 'Create Shipment'], description: 'Generic HTTP method (`GET`/`POST`/`DELETE`) or a pre-built action (`Address Validation`, `Create Shipment`).' },
          path: { type: 'string', description: 'UPS API path appended to the connection URL. Used for generic HTTP actions.' },
          data: { type: 'object', description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'UPS OAuth': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of UPS OAuth REST API requests. Uses `action` instead of the common `method`. Each item returns `{ body, errors }`.',
      items: { type: 'object', description: 'A single UPS API request.', required: ['action'],
        properties: {
          action: { type: 'string', enum: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'], description: 'HTTP method (UPPERCASE). Used in place of `method`.' },
          path: { type: 'string', description: 'UPS API path appended to the connection URL.' },
          data: { type: 'object', description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'USPS': {
    inputSchema: {
      type: 'array', minItems: 1, description: "Array of USPS XML API calls. Data is sent as the `XML=...` query parameter (not request body); the connector injects the configured `USERID`. Responses are parsed from XML to JSON.",
      items: { type: 'object', description: 'A single USPS request.', required: ['action'],
        properties: {
          action: { type: 'string', enum: ['POST'], description: 'Always `POST`. Reserved for future USPS actions.' },
          path: { type: 'string', description: 'URL path appended to the connection URL.' },
          api: { type: 'string', description: 'USPS API name sent as the `API` query parameter (e.g. `Verify`, `RateV4`).' },
          data: { type: ['string', 'object'], description: "XML data. Must contain `USERID=''`; the connector injects the configured UserId." },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'WooCommerce': {
    inputSchema: {
      type: 'array', minItems: 0, description: 'Array of WooCommerce REST API requests. Each item returns `{ data }` or `{ error }`.',
      items: { type: 'object', description: 'A single WooCommerce API request.', required: ['path', 'method'],
        properties: {
          path: { type: 'string', description: 'WooCommerce API path (prepended with `/wp-json/wc/{version}/`).' },
          method: { type: 'string', enum: ['GET', 'PUT', 'POST', 'DELETE'], description: 'HTTP method (UPPERCASE).' },
          version: { type: 'string', enum: ['v2', 'v3'], description: 'WooCommerce API version. Defaults to `v3`.' },
          parameters: { type: 'object', description: 'Query string parameters.' },
          data: { type: 'object', description: 'Request body.' },
        } },
    },
    outputSchema: { type: 'array', minItems: 0 },
  },

  'Zoho': {
    inputSchema: {
      type: 'array', minItems: 1, description: 'Array of Zoho REST API requests.',
      items: { type: 'object', description: 'A single Zoho API request.', required: ['method', 'path'],
        properties: {
          method: { type: 'string', enum: ['get', 'put', 'post', 'delete'], description: 'HTTP method (lowercase).' },
          path: { type: 'string', description: 'Zoho API path appended to the connection URL.' },
          data: { type: 'object', description: 'Request body.' },
          modifiedSince: { type: 'string', format: 'date-time', description: 'ISO date-time sent as `If-Modified-Since` header to fetch only records changed after this time.' },
          options: { type: 'object', description: 'Per-request options.', properties: { pages: { type: 'object', description: 'Page-range pagination. When set, the connector loops from `start` to `stop` using the `page` query parameter.', required: ['start'], properties: {
            start: { type: 'integer', minimum: 1, description: 'First page number to fetch (1-based).' }, stop: { type: 'integer', minimum: 1, description: 'Last page number to fetch. Defaults to Infinity (stops when a page returns no results).' },
          } } } },
        } },
    },
    outputSchema: { type: 'array', minItems: 0, items: { type: 'object' } },
  },
};
