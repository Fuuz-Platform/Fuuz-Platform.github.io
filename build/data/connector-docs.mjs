/* build/data/connector-docs.mjs — real per-connector API documentation, queried live from the
 * `Connector` model on the `fuuz-administration` tenant (system_query_model, 2026-09-16) — the
 * same model that backs the platform's own connector picker and API documentation page. Not
 * reachable from the public GitHub Actions runner (no tenant credentials there), so — like the
 * HTTP/Confluence schemas hand-scraped into the private connector-catalog accelerator — this is a
 * point-in-time snapshot to re-sync by hand against the live tenant, not a live query.
 *
 * `credentials`: the real fields from each connector's `credentialsSchema`, in the platform's own
 * field order. `required: false` covers two shapes: genuinely optional (e.g. FTP's Passphrase), and
 * "one of several" (FTP's Password vs SSH Key; Magento's Token vs Username+Password) — noted in
 * `note` where that distinction matters. `notes` is the platform's own `inputSchema` description,
 * trimmed, not a paraphrase — it's already written for a human reader.
 *
 * To add a connector here: query `Connector { name credentialsSchema inputSchema }` on any live
 * tenant's Fuuz MCP for the new row and transcribe the same shape below.
 */

export const CONNECTOR_DOCS = {
  'ADP': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }],
    notes: 'Array of ADP Workforce Now API requests. Options include a `roleCode` header controlling the caller\'s visibility scope, and a `masked` flag (default true) that has ADP mask sensitive fields like SSN in the response.',
  },
  'ADP Vista': {
    credentials: [{ label: 'Client Id' }, { label: 'Client Secret', secret: true }, { label: 'Company Code' }, { label: 'Login ID' }, { label: 'Scope' }],
    notes: 'Array of ADP Vista API requests (get/post only). Connection options (country, paymentUnit, legalEntity) are sent as request headers.',
  },
  'Amazon Data Firehose': {
    credentials: [{ label: 'Access Key ID' }, { label: 'Secret Access Key', secret: true }, { label: 'Session Token', secret: true, required: false, note: 'temporary credentials only' }],
    notes: 'PutRecord / PutRecordBatch calls to a named delivery stream. Batch mode caps at 500 records per call.',
  },
  'Amazon SPAPI': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }, { label: 'AWS Access Key ID' }, { label: 'AWS Secret Access Key', secret: true }, { label: 'Selling Partner Role' }],
    notes: 'callAPI / download / upload actions covering the Selling Partner API, report documents, and feed submission.',
  },
  'Arena': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }, { label: 'Client ID' }],
    notes: 'Array of Arena PLM REST API requests. Session token from credentials is sent as the `arena_session_id` header.',
  },
  'AWS Lambda': {
    credentials: [{ label: 'Access Key ID' }, { label: 'Secret Access Key', secret: true }, { label: 'Session Token', secret: true, required: false, note: 'temporary credentials only' }],
    notes: 'Direct AWS SDK command invocations (InvokeCommand, ListFunctionsCommand, etc.) by name.',
  },
  'C. H. Robinson': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }, { label: 'Audience', required: false, note: 'defaulted' }, { label: 'Grant Type', required: false, note: 'defaulted to client_credentials' }],
    notes: 'Array of C.H. Robinson (Navisphere) REST API requests.',
  },
  'Channel Advisor': {
    credentials: [{ label: 'Application ID' }, { label: 'Shared Secret' }, { label: 'Grant Type' }, { label: 'Refresh Token' }, { label: 'Redirect URL', required: false }],
    notes: 'Array of ChannelAdvisor REST API requests.',
  },
  'Clover': {
    credentials: [{ label: 'Authorization Token', secret: true }],
    notes: 'Array of Clover REST API requests. `filters`, `expand`, `limit` and `orderBy` are serialized into Clover query parameters.',
  },
  'Confluence': {
    credentials: [{ label: 'Email' }, { label: 'API Key', secret: true }],
    notes: 'Array of Confluence REST API requests. Authenticated via Basic auth with email:apiKey.',
  },
  'Dynamics 365': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }, { label: 'Scope' }],
    notes: 'Array of Dynamics 365 REST API requests (uppercase HTTP methods). Covers F&O, Business Central, CRM and Dataverse under one connector.',
  },
  'EDI Nation': {
    credentials: [{ label: 'OCP APIM Subscription Key', secret: true }],
    notes: 'read / write / ack / validate actions over X12 or EDIFACT EDI data.',
  },
  'Fanuc ZDT Data API': {
    credentials: [{ label: 'API Key', secret: true }],
    notes: 'Generic REST requests against the FANUC Zero Down Time Data API (typically dataapi.fanuczdt.com).',
  },
  'FedEx': {
    credentials: [
      { label: 'Client Detail — Account Number, Meter Number' },
      { label: 'User Credentials — Login Key, Password', secret: true },
      { label: 'Parent Credentials — Login Key, Password', secret: true },
    ],
    notes: 'Legacy FedEx SOAP API — Address Validation, Rates, Shipping Validation, Shipment Create/Delete, or a raw POST. Requests are XML, responses are parsed to JSON.',
  },
  'FedEx REST': {
    credentials: [{ label: 'API Key (Client ID)' }, { label: 'Secret Key (Client Secret)', secret: true }],
    notes: 'Modern FedEx REST API requests.',
  },
  'FTP': {
    credentials: [
      { label: 'Username' },
      { label: 'Password', secret: true, required: false, note: 'one of Password or SSH Key is required' },
      { label: 'SSH Key', required: false, note: 'one of Password or SSH Key is required' },
      { label: 'Passphrase', secret: true, required: false },
      { label: 'Host Key / Host Key Hash', required: false },
    ],
    notes: 'FTP/FTPS/SFTP file operations — get, getAllInDir, post, put, delete, move, list. Required fields per operation are enforced by the connector.',
  },
  'Fuuz': {
    credentials: [{ label: 'Fuuz API Key', secret: true }],
    notes: 'Cross-tenant calls to another Fuuz instance — GraphQL query/mutation, run a data flow, a saved query, a saved script, or publish to a topic. Max 100 items per request.',
  },
  'Fuuz UPS': {
    credentials: [{ label: 'Access License Number', required: false, note: 'Fuuz-managed UPS credentials — most fields are sourced from server config' }],
    notes: 'Fuuz-managed UPS requests plus license-management actions (License Agreement, License Request) alongside generic HTTP.',
  },
  'Google API': {
    credentials: [{ label: 'Client Email' }, { label: 'Private Key', secret: true }],
    notes: 'Calls dispatched via the googleapis client — google[api]({version,auth})[resource][action](...). One connector reaches the entire Google Cloud and Workspace API surface.',
  },
  'HTTP': {
    credentials: [{ label: 'Username', required: false }, { label: 'Password', secret: true, required: false }],
    notes: 'Generic REST calls — method, path, headers, body — against whatever endpoint the connection URL points at. Basic auth is optional; a bearer token or API key is sent as a header instead.',
  },
  'Infor': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }, { label: 'Grant Type' }, { label: 'Access Token URL' }, { label: 'Username' }, { label: 'Password', secret: true }, { label: 'Scope', required: false }],
    notes: 'Array of Infor ION API requests. Responses are inspected for Infor-specific error fields.',
  },
  'Körber PAS-X MSI': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true, note: 'OAuth password-grant token request' }],
    notes: 'Publishes MSI messages (SF_TO_MES) to Körber PAS-X over its MSI Web Service — outbound publish only.',
  },
  'Magento': {
    credentials: [{ label: 'Token', secret: true, required: false, note: 'Token, or Username + Password' }, { label: 'Username', required: false }, { label: 'Password', secret: true, required: false }],
    notes: 'Array of Magento REST API requests. `filters` and `pagination` are serialized into Magento searchCriteria[...] query parameters.',
  },
  'MFGx': {
    credentials: [{ label: 'Username' }, { label: 'API Key', secret: true }],
    notes: 'GraphQL calls to a legacy MFGx instance.',
  },
  'Microsoft SQL Server': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }],
    notes: 'Sequential SQL queries or stored procedure calls against a pooled connection, with typed parameter binding.',
  },
  'NetSuite REST': {
    credentials: [{ label: 'Account ID' }, { label: 'Consumer Key' }, { label: 'Consumer Secret', secret: true }, { label: 'Token ID' }, { label: 'Token Secret', secret: true }],
    notes: 'NetSuite REST/SuiteQL requests — uses `endpoint`/`action` in place of the common `path`/`method`.',
  },
  'NetSuite SOAP': {
    credentials: [{ label: 'Account ID' }, { label: 'Consumer Key' }, { label: 'Consumer Secret', secret: true }, { label: 'Token ID' }, { label: 'Token Secret', secret: true }],
    notes: 'NetSuite SuiteTalk SOAP operations by name (add, search, upsert, getList, async* variants, etc.).',
  },
  'ODBC': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }, { label: 'NetSuite OAuth block', required: false, note: 'OAuth URL, Account/Role/Client/Key ID, Private Key, signing algorithm — only when connecting to NetSuite over ODBC' }],
    notes: 'SQL queries with `?` bind variables, executed in a worker pool against whatever ODBC driver the connection configures (Plex, NetSuite, etc.).',
  },
  'OpenAI Chat': {
    credentials: [{ label: 'API Key', secret: true }],
    notes: 'ChatCompletion requests forwarded to client.chat.completions.create. Connection options deep-merge with each request — useful for a default system message.',
  },
  'Plex API': {
    credentials: [{ label: 'Consumer Key', secret: true }],
    notes: 'Plex Connect API requests; tenant ID is sent as the X-Plex-Connect-Tenant-Id header.',
  },
  'Plex Classic': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }],
    notes: 'Plex Classic datasource executions via SOAP, with key-based or offset-based pagination.',
  },
  'Plex IAM API': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }],
    notes: 'Plex IAM API requests.',
  },
  'Plex UX': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }],
    notes: 'Plex UX (JSON REST) datasource execution or GET-mode metadata/search, with the same pagination options as Plex Classic.',
  },
  'QuickBooks': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }, { label: 'Refresh Token', secret: true, note: 'rotates periodically' }],
    notes: 'QuickBooks Online REST API requests.',
  },
  'Salesforce': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }, { label: 'Client ID' }, { label: 'Client Secret', secret: true }],
    notes: 'Array of Salesforce REST API requests, with `pagination: true` to auto-follow nextRecordsUrl across pages.',
  },
  'SAP Cloud (S/4HANA)': {
    credentials: [{ label: 'Authorization Token', secret: true }],
    notes: 'SAP Cloud OData requests — top/skip/filter/orderby/select/expand map to the OData $-prefixed query parameters.',
  },
  'SAP Success Factors': {
    credentials: [{ label: 'API Key' }, { label: 'Company Id' }, { label: 'Username' }, { label: 'Private Key', secret: true }, { label: 'Certificate', secret: true }, { label: 'Issuer / Audiences / User Type', required: false }],
    notes: 'SAP SuccessFactors REST API requests (uppercase HTTP methods).',
  },
  'SMTP': {
    credentials: [{ label: 'Username' }, { label: 'Password', secret: true }],
    notes: 'Sends email via nodemailer — from/to/subject plus text or html, with attachments by inline content or URL reference.',
  },
  'Spiro': {
    credentials: [{ label: 'Authorization Token', secret: true }],
    notes: 'Spiro REST API requests using JSON:API content type, with page-range pagination.',
  },
  'Square': {
    credentials: [{ label: 'Personal Access Token', secret: true }],
    notes: 'Square REST API requests, with cursor-based pagination auto-followed by default.',
  },
  'TecCom File Upload': {
    credentials: [{ label: 'Client Id' }, { label: 'Client Secret', secret: true }, { label: 'TecCom Id' }],
    notes: 'Batches of typed rows converted to CSV, zipped and uploaded — REPLACE overwrites the dataset, MODIFY applies incremental changes.',
  },
  'TecCom Web Services': {
    credentials: [{ label: 'User Name' }, { label: 'Password', secret: true }],
    notes: 'TecCom SOAP web service calls selected by function identifier.',
  },
  'UPS': {
    credentials: [
      { label: 'Username Token — Username, Password', secret: true },
      { label: 'Transaction Source' },
      { label: 'Service Access Token — Access License Number', secret: true },
    ],
    notes: 'Legacy UPS API. Action-based routing selects generic HTTP or pre-built flows (Address Validation, Create Shipment).',
  },
  'UPS OAuth': {
    credentials: [{ label: 'Client Id' }, { label: 'Client Secret', secret: true }, { label: 'Account Number' }],
    notes: 'Modern UPS OAuth REST API requests — uses `action` (uppercase HTTP method) in place of `method`.',
  },
  'USPS': {
    credentials: [{ label: 'User ID' }],
    notes: 'USPS XML API calls (Verify, RateV4, etc.) — data is sent as an XML query parameter, not a request body; responses are parsed from XML to JSON.',
  },
  'WooCommerce': {
    credentials: [{ label: 'Consumer Key' }, { label: 'Consumer Secret', secret: true }],
    notes: 'WooCommerce REST API requests (v2 or v3) against a WordPress site.',
  },
  'Zoho': {
    credentials: [{ label: 'Client ID' }, { label: 'Client Secret', secret: true }, { label: 'Authorization Token', secret: true }],
    notes: 'Zoho REST API requests, with `modifiedSince` and page-range pagination options.',
  },
};
