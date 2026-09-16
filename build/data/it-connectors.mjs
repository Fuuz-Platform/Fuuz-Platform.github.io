/* build/data/it-connectors.mjs — source data for site/connectors/cloud/index.html.
 *
 * NAMED mirrors the private monorepo's `fuuz/accelerators/connector-catalog/data.cjs` NATIVE
 * list (the same data that feeds the in-platform Connector Catalog screen) — real, shipped Fuuz
 * connectors. Re-sync by hand from that file when it changes: add an entry here with a
 * `category` and, if Fuuz hosts a public logo for it (most do, at the `s3` id below), the id from
 * that file's NATIVE array. `ECHO` (a test fixture in that catalog, not a real connector) and
 * `OpenAI Chat` (rendered in LLMS instead, category 'AI' below is intentionally never rendered as
 * its own grid category) are the only two entries deliberately excluded/redirected.
 *
 * HTTP_ONLY is everything reachable today over the plain HTTP connector with nothing special —
 * Basic auth, a bearer token, or an API key — and no named connector required. Most of these mirror
 * that same file's ADAPTED list (marked `source: 'catalog'` below); the rest (`source: 'kb'`) are
 * additional systems the cloud-connectors support KB documents as HTTP-reachable that aren't in
 * the platform's own catalog yet. `logo` is a local file under site/assets/logos/, fetched from
 * each vendor's Wikipedia infobox (nominative use, nothing re-hosted from the vendor itself) —
 * `null` falls back to a text badge, same as the platform's own connector picker does for a vendor
 * with no usable mark.
 *
 * To add a connector: add one entry to the right array, with a category and a logo if you have
 * one. Re-run `node build/generate.mjs` — nothing else changes.
 */

const S3 = 'https://mfgx-public.s3.us-east-1.amazonaws.com/integration-connector-images/';
const s3 = id => S3 + id + '.webp';

export const NAMED = [
  { name: 'ADP', category: 'HCM', logo: s3('6a6da1f8-b69c-11e8-96f8-529269fb1459') },
  { name: 'ADP Vista', category: 'HCM', logo: s3('5b2ed01a-628e-413e-8baf-f6d4c01fb53b') },
  { name: 'Amazon Data Firehose', category: 'Cloud, Data & Observability', logo: s3('a2f4d8c6-1e3b-4a7d-9c5f-8b6e2d1a4c9f') },
  { name: 'Amazon SPAPI', category: 'eCommerce & POS', logo: s3('085c0e1b-e0f2-47ae-a81f-1af51f90aeea') },
  { name: 'Arena', category: 'Quality & PLM', logo: s3('c6a47b3d-5740-4cec-a9d1-dfba96249d03') },
  { name: 'AWS Lambda', category: 'Cloud, Data & Observability', logo: s3('37766115-8263-4d3c-bae1-984d97372221') },
  { name: 'C. H. Robinson', category: 'Shipping & Logistics', logo: s3('3c751b02-b23c-4615-9eba-c7a5dc33c507') },
  { name: 'Channel Advisor', category: 'eCommerce & POS', logo: s3('1bbd8c15-601e-43f5-b584-e898ba58bfd2') },
  { name: 'Clover', category: 'eCommerce & POS', logo: s3('2d259032-b9ea-4904-afbf-d30d4fc142a9') },
  { name: 'Confluence', category: 'Cloud, Data & Observability', logo: s3('d7ca2d1a-cc71-47fb-8b26-d316bfaedaf9') },
  { name: 'Dynamics 365', category: 'ERP', logo: s3('808fce4c-6e38-4db8-b4b4-5c45a5a6f1cb') },
  { name: 'EDI Nation', category: 'Shipping & Logistics', logo: null },
  { name: 'Fanuc ZDT Data API', category: 'Manufacturing & Industry-Specific', logo: s3('6084f831-a31a-4dce-b0f2-a6ab012333d5') },
  { name: 'FedEx', category: 'Shipping & Logistics', logo: s3('d16be6b2-ad5e-4b32-8e54-03f168b947f4') },
  { name: 'FedEx REST', category: 'Shipping & Logistics', logo: s3('1f919318-5b52-4bf9-b7ee-21fb7a561fd9') },
  { name: 'FTP', category: 'Technology Connectors', logo: null },
  { name: 'Fuuz', category: 'Platform & Cross-Tenant', logo: s3('43b90e5f-48a5-437c-b968-6f35a1663257') },
  { name: 'Fuuz UPS', category: 'Shipping & Logistics', logo: s3('906f591e-0cac-41f7-9fc3-bdbae5d6117a') },
  { name: 'Google API', category: 'Cloud, Data & Observability', logo: s3('2ab3d71a-2b81-4253-8428-8c359a26f082') },
  { name: 'HTTP', category: 'Technology Connectors', logo: null },
  { name: 'Infor', category: 'ERP', logo: s3('07ba704-0eef-11eb-adc1-0242ac120002') },
  { name: 'Körber PAS-X MSI', category: 'Manufacturing & Industry-Specific', logo: s3('60af4e81-6a6c-4f06-b19e-846fe2de9e02') },
  { name: 'Magento', category: 'eCommerce & POS', logo: s3('3d3b20ea-f261-40c1-9094-a556e60ce5e9') },
  { name: 'MFGx', category: 'Platform & Cross-Tenant', logo: s3('970ae55b-7ad0-497e-a77e-f9eb63aff73d') },
  { name: 'Microsoft SQL Server', category: 'Technology Connectors', logo: s3('bb612514-2129-4fa9-849d-f9f8f6ec1c8e') },
  { name: 'NetSuite REST', category: 'ERP', logo: s3('ac61106b-72c6-4fca-8bc7-0ba3d54fb574') },
  { name: 'NetSuite SOAP', category: 'ERP', logo: s3('3c94fb0e-0767-11ec-9a03-0242ac130003') },
  { name: 'ODBC', category: 'Technology Connectors', logo: null },
  { name: 'OpenAI Chat', category: 'AI', logo: s3('e86501cd-80b4-46ea-97c8-33d31cfef632') },
  { name: 'Plex API', category: 'ERP', logo: s3('1cc8888c-bc12-4545-b354-d26f9493f0ac') },
  { name: 'Plex Classic', category: 'ERP', logo: s3('464e9c3f-dd6c-47af-8078-cda1ff25e966') },
  { name: 'Plex IAM API', category: 'ERP', logo: s3('9db652bf-9f99-472e-ada2-71f8e92f973f') },
  { name: 'Plex UX', category: 'ERP', logo: s3('72974b11-897f-47bd-896d-133962ef7bbb') },
  { name: 'QuickBooks', category: 'eCommerce & POS', logo: s3('88c548f7-4944-4eed-a948-9ce683e02a6f') },
  { name: 'Salesforce', category: 'CRM', logo: s3('44ff6253-ca43-4429-955a-2907803178b8') },
  { name: 'SAP Cloud (S/4HANA)', category: 'ERP', logo: s3('34e36d24-64f3-4d59-a764-bab5b851f72d'), note: 'Public or private cloud SAP deployments.' },
  { name: 'SAP Success Factors', category: 'HCM', logo: s3('165219c4-830b-49af-828f-7964d4e4bd08') },
  { name: 'SMTP', category: 'Technology Connectors', logo: null },
  { name: 'Spiro', category: 'CRM', logo: s3('fa98a8d9-74f3-4ce1-8ef9-4455c31d3ce4') },
  { name: 'Square', category: 'eCommerce & POS', logo: s3('c125d58f-41f5-41f5-b42e-3a63e3441526') },
  { name: 'TecCom File Upload', category: 'Manufacturing & Industry-Specific', logo: s3('e2c23250-2da3-41af-8ea5-abe14a4aa77c') },
  { name: 'TecCom Web Services', category: 'Manufacturing & Industry-Specific', logo: s3('395ab4e2-2ef4-471c-ad42-5fdad7f22d6f') },
  { name: 'UPS', category: 'Shipping & Logistics', logo: s3('920e8e71-1de6-4160-8129-f16612c0d694') },
  { name: 'UPS OAuth', category: 'Shipping & Logistics', logo: s3('c13ebe14-08f3-4c6a-bb1d-c717d8430ab9') },
  { name: 'USPS', category: 'Shipping & Logistics', logo: s3('c1ce6d2d-0e76-4683-9b06-00812f5514f4') },
  { name: 'WooCommerce', category: 'eCommerce & POS', logo: s3('09fb753b-6b94-48b6-b70e-31ce7acdddac') },
  { name: 'Zoho', category: 'CRM', logo: s3('4ff8769a-bdea-11e8-a355-529269fb1459') },
];

/* Rendered under the ERP tile group — SAP Cloud (S/4HANA) above is the cloud connector; SAP RFC
 * is a Device Gateway driver (direct BAPI calls, no middleware, no cloud hop), for on-premise ECC
 * and S/4HANA. Two different connectors for two different SAP deployment shapes, not two names
 * for the same thing. */
export const CATEGORY_FOOTNOTES = {
  'ERP': 'SAP RFC — direct on-premise BAPI calls, no middleware — is a Device Gateway driver for on-prem ECC/S&#8203;4HANA, not a cloud connector. See <a href="../edge/#drivers">Edge &amp; OT</a>.',
};

export const HTTP_ONLY = [
  // PLM & PDM
  { name: 'Windchill', category: 'PLM & PDM', logo: 'windchill.svg', note: 'bearer or basic auth', source: 'catalog' },
  { name: 'Teamcenter', category: 'PLM & PDM', logo: 'teamcenter.svg', note: 'SOA session token', source: 'catalog' },
  { name: 'Aras Innovator', category: 'PLM & PDM', logo: 'aras-innovator.svg', note: 'basic or token auth', source: 'catalog' },
  // HR & workforce
  { name: 'Workday', category: 'HR & Workforce', logo: 'workday.svg', note: 'OAuth2 bearer, SOAP-primary EIB batch', source: 'catalog' },
  { name: 'UKG Pro/Ready', category: 'HR & Workforce', logo: null, note: 'REST + legacy SOAP', source: 'kb' },
  { name: 'BambooHR', category: 'HR & Workforce', logo: 'bamboohr.svg', note: 'REST only', source: 'kb' },
  // ERP & finance (generic HTTP — see Named Connectors for the purpose-built ERP paths)
  { name: 'SAP Business One', category: 'ERP & Finance (generic HTTP)', logo: s3('34e36d24-64f3-4d59-a764-bab5b851f72d'), note: 'Service Layer REST', source: 'kb' },
  { name: 'Oracle ERP Cloud', category: 'ERP & Finance (generic HTTP)', logo: 'oracle-fusion-cloud.svg', note: 'REST, FBDI, BICC', source: 'kb' },
  { name: 'Epicor Kinetic', category: 'ERP & Finance (generic HTTP)', logo: 'epicor.svg', note: 'OData/Swagger', source: 'kb' },
  { name: 'Acumatica', category: 'ERP & Finance (generic HTTP)', logo: 'acumatica.svg', note: 'OpenAPI', source: 'kb' },
  { name: 'Sage X3', category: 'ERP & Finance (generic HTTP)', logo: 'sage-x3.svg', note: 'REST, mature SOAP', source: 'kb' },
  { name: 'SugarCRM', category: 'ERP & Finance (generic HTTP)', logo: 'sugarcrm.jpg', note: 'REST V11+, legacy SOAP', source: 'kb' },
  // Procurement & planning
  { name: 'SAP Ariba', category: 'Procurement & Planning', logo: 'sap-ariba.svg', note: 'client-credentials + apikey header', source: 'catalog' },
  { name: 'Coupa', category: 'Procurement & Planning', logo: 'coupa.svg', note: 'bearer or X-COUPA-API-KEY', source: 'catalog' },
  { name: 'Anaplan', category: 'Procurement & Planning', logo: 'anaplan.svg', note: 'bearer token', source: 'catalog' },
  { name: 'Blue Yonder', category: 'Procurement & Planning', logo: 'blue-yonder.png', note: 'OAuth2 client-credentials', source: 'catalog' },
  { name: 'IFS Cloud', category: 'Procurement & Planning', logo: 'ifs-cloud.png', note: 'OAuth2 bearer', source: 'catalog' },
  { name: 'Oracle Fusion Cloud', category: 'Procurement & Planning', logo: 'oracle-fusion-cloud.svg', note: 'basic or OAuth2 bearer', source: 'catalog' },
  // eCommerce, payments & logistics
  { name: 'Shopify / Plus', category: 'eCommerce, Payments & Logistics', logo: 'shopify.svg', note: 'REST + GraphQL', source: 'kb' },
  { name: 'Stripe', category: 'eCommerce, Payments & Logistics', logo: 'stripe.svg', note: 'API key, REST', source: 'kb' },
  { name: 'DHL', category: 'eCommerce, Payments & Logistics', logo: 'dhl.svg', note: 'REST + EDIFACT', source: 'kb' },
  // Service, ITSM & quality
  { name: 'ServiceNow', category: 'Service, ITSM & Quality', logo: 'servicenow.svg', note: 'basic or OAuth bearer', source: 'catalog' },
  { name: 'Jira Cloud', category: 'Service, ITSM & Quality', logo: 'jira-cloud.svg', note: 'basic (email:token) or OAuth bearer', source: 'catalog' },
  { name: 'Zendesk', category: 'Service, ITSM & Quality', logo: 'zendesk.svg', note: 'basic, token, or OAuth', source: 'catalog' },
  { name: 'ETQ Reliance', category: 'Service, ITSM & Quality', logo: null, note: 'REST + custom APIs', source: 'kb' },
  { name: 'MasterControl', category: 'Service, ITSM & Quality', logo: null, note: 'REST + custom APIs', source: 'kb' },
  { name: 'Veeva Vault', category: 'Service, ITSM & Quality', logo: 'veeva-vault.svg', note: 'REST + custom APIs', source: 'kb' },
  { name: 'InfinityQS ProFicient', category: 'Service, ITSM & Quality', logo: null, note: 'REST + ODBC', source: 'kb' },
  { name: 'IBM Maximo', category: 'Service, ITSM & Quality', logo: null, note: 'MIF/OSLC REST', source: 'kb' },
  { name: 'Fiix', category: 'Service, ITSM & Quality', logo: null, note: 'modern REST', source: 'kb' },
  { name: 'UpKeep', category: 'Service, ITSM & Quality', logo: null, note: 'modern REST', source: 'kb' },
  { name: 'MaintainX', category: 'Service, ITSM & Quality', logo: null, note: 'modern REST', source: 'kb' },
  // Collaboration & DevOps
  { name: 'Slack', category: 'Collaboration & DevOps', logo: 'slack.svg', note: 'bearer (xoxb-…)', source: 'catalog' },
  { name: 'Microsoft Graph / SharePoint', category: 'Collaboration & DevOps', logo: 'microsoft-graph.svg', note: 'Azure AD OAuth2 bearer', source: 'catalog' },
  { name: 'Smartsheet', category: 'Collaboration & DevOps', logo: 'smartsheet.png', note: 'bearer token', source: 'catalog' },
  { name: 'Box', category: 'Collaboration & DevOps', logo: 'box.svg', note: 'OAuth2 bearer', source: 'catalog' },
  { name: 'DocuSign', category: 'Collaboration & DevOps', logo: null, note: 'OAuth2 bearer (JWT grant)', source: 'catalog' },
  { name: 'Okta', category: 'Collaboration & DevOps', logo: 'okta.svg', note: 'SSWS token or OAuth bearer', source: 'catalog' },
  { name: 'GitHub', category: 'Collaboration & DevOps', logo: 'github.svg', note: 'PAT or OAuth2', source: 'kb' },
  { name: 'GitLab', category: 'Collaboration & DevOps', logo: 'gitlab.svg', note: 'PAT or OAuth2', source: 'kb' },
  { name: 'Azure DevOps', category: 'Collaboration & DevOps', logo: null, note: 'PAT or OAuth2', source: 'kb' },
  { name: 'Microsoft Fabric / Power BI / Teams / Copilot', category: 'Collaboration & DevOps', logo: 'microsoft-graph.svg', note: 'Graph API, OAuth2', source: 'kb' },
  // Cloud, data & observability
  { name: 'Snowflake', category: 'Cloud, Data & Observability', logo: 'snowflake.svg', note: 'key-pair or OAuth2 bearer', source: 'catalog' },
  { name: 'Databricks', category: 'Cloud, Data & Observability', logo: 'databricks.svg', note: 'bearer token', source: 'catalog' },
  { name: 'HubSpot', category: 'Cloud, Data & Observability', logo: 'hubspot.svg', note: 'bearer token', source: 'catalog' },
  { name: 'PagerDuty', category: 'Cloud, Data & Observability', logo: null, note: 'Authorization: Token token=…', source: 'catalog' },
  { name: 'Datadog', category: 'Cloud, Data & Observability', logo: 'datadog.svg', note: 'API key', source: 'kb' },
  { name: 'Splunk', category: 'Cloud, Data & Observability', logo: 'splunk.svg', note: 'API key / bearer', source: 'kb' },
  { name: 'Grafana', category: 'Cloud, Data & Observability', logo: 'grafana.svg', note: 'API key / bearer', source: 'kb' },
  { name: 'New Relic', category: 'Cloud, Data & Observability', logo: 'new-relic.png', note: 'API key', source: 'kb' },
  { name: 'MongoDB Atlas', category: 'Cloud, Data & Observability', logo: 'mongodb.svg', note: 'Atlas Data API', source: 'kb' },
  { name: 'Azure AI Services', category: 'Cloud, Data & Observability', logo: 'microsoft-graph.svg', note: 'API key / Azure AD', source: 'kb' },
  { name: 'Amazon S3 / DynamoDB / SQS / SNS', category: 'Cloud, Data & Observability', logo: s3('37766115-8263-4d3c-bae1-984d97372221'), note: 'AWS Signature V4, IAM', source: 'kb' },
  { name: 'Amazon Redshift', category: 'Cloud, Data & Observability', logo: s3('37766115-8263-4d3c-bae1-984d97372221'), note: 'Data API (ODBC also available)', source: 'kb' },
  { name: 'Google Cloud Run', category: 'Cloud, Data & Observability', logo: s3('2ab3d71a-2b81-4253-8428-8c359a26f082'), note: 'OAuth2, REST', source: 'kb' },
];

export const OTHER_HTTP_OPTIONS = 'Not every IT integration is an outbound REST call: <strong>FTP</strong> is its own built-in generic connector (see Technology Connectors above) for straight file drops, and inbound <strong>webhooks</strong> from a SaaS system land on the same <strong>HTTP Server</strong> driver documented on the <a href="../edge/#drivers">Edge &amp; OT</a> page. Which of the three fits is a question for your IT group\'s constraints, not a platform limitation.';

export const LLMS = [
  { name: 'Anthropic Claude', tag: 'Connected today', tagClass: 'tag-live', logo: null,
    desc: 'Standard HTTP connector, API key auth, REST, SSE streaming. No named connector required — this is the live pattern Fuuz uses for Claude.ai now.' },
  { name: 'OpenAI (GPT-4, o-series)', tag: null, logo: s3('e86501cd-80b4-46ea-97c8-33d31cfef632'),
    desc: '<strong>OpenAI Chat</strong> — a purpose-built named connector, API key / bearer token auth. Token-based pricing; the Realtime API\'s WebSocket transport isn\'t reachable from the cloud connector.' },
  { name: 'Google Gemini / Vertex AI', tag: null, logo: s3('2ab3d71a-2b81-4253-8428-8c359a26f082'),
    desc: 'Covered under the named <strong>Google API</strong> connector — OAuth2, REST — the same connector that reaches the rest of Google Cloud and Workspace.' },
  { name: 'Azure OpenAI', tag: null, logo: 'microsoft-graph.svg',
    desc: 'Standard HTTP connector, API key or Azure AD auth. No named connector required.' },
  { name: 'AWS Bedrock', tag: null, logo: s3('37766115-8263-4d3c-bae1-984d97372221'),
    desc: 'Standard HTTP connector, AWS Signature V4, the InvokeModel API across every foundation model Bedrock hosts.' },
  { name: 'Meta Llama, Mistral, Cohere, Hugging Face', tag: null, logo: null,
    desc: 'Standard HTTP connector; auth varies by provider (API key or bearer token). No named connector required for any of them.' },
];

export const RECENT = [
  { id: 'pas-x', name: 'Körber PAS-X MSI', tag: 'New', logo: s3('60af4e81-6a6c-4f06-b19e-846fe2de9e02'),
    desc: 'A purpose-built named connector: publishes MSI messages (SF_TO_MES) to Körber PAS-X over its MSI Web Service. Outbound publish only, matching how PAS-X expects to receive shop-floor instructions — this is not a generic HTTP adaptation.' },
  { id: 'lm-studio', name: 'LM Studio', tag: 'New', logo: null,
    desc: 'A self-hosted local model server with an OpenAI-compatible REST API. Reaches Fuuz over the same standard HTTP connector as any cloud LLM — point it at the LM Studio host\'s endpoint (typically on the local network, so no special auth is usually needed) and it\'s a drop-in swap for a cloud provider in a data flow.' },
];
