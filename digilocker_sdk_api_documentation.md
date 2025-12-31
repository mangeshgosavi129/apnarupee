# Introduction

> This integration guide provides a step-by-step process to integrate the Digilocker SDK into your application.

<CardGroup cols={2}>
  <Card title="Web" icon="laptop" href="./platforms/web" />

  <Card title="Android" icon="android" href="./platforms/android" />

  <Card title="iOS" icon="apple" href="./platforms/ios" />

  <Card title="Flutter" icon="flutter" href="https://pub.dev/packages/sandbox_digilocker_sdk" arrow="true" />
</CardGroup>


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt




# Web

> This integration guide provides a step-by-step process to integrate the Digilocker SDK into your web application.

<Steps>
  <Step title="Create a Session" stepNumber={1} titleSize="h2">
    Before initializing the SDK, you must create a **unique session**.\
    Each SDK instance requires its own session to ensure secure and independent interactions.

    Use the [Create Session](../../endpoints/create-session) endpoint to generate this session.\
    This is a **server-side API call** that uses [Sandbox Authentication](/api-reference/authenticate) to validate your credentials.

    Once created, you’ll receive a `session_id`, which you’ll need when initializing the SDK on the client side.
  </Step>

  <Step title="Integrate the SDK on the Client Side" titleSize="h2">
    After creating the session, the next step is to integrate the DigiLocker SDK into your client-side application.\
    You’ll add a “Fetch with DigiLocker” button that triggers the DigiLocker flow.

    <AccordionGroup>
      <Accordion title="2.1 Example: “Fetch with DigiLocker” Button" defaultOpen>
        ```html expandable theme={null}

        <script src="https://sdk.sandbox.co.in/kyc/digilocker/sdk.js"></script>

        <script>
          function launch() {
            // Define a custom event listener to handle SDK events
            class EventListener extends DigilockerSDK.EventListener {
              constructor(callback) {
                super();
                this.callback = callback;
              }
              onEvent(event) {
                if (this.callback) {
                  this.callback(event);
                }
              }
            }
            
            // Define a callback function to process events from the SDK
            const handleEvent = (event) => {
              console.log("Received event:", event);
            };

            // Initialize the event listener with your callback
            const eventListener = new EventListener(handleEvent);
            DigilockerSDK.setEventListener(eventListener);


            // Set your API key
            DigilockerSDK.setAPIKey("YOUR_API_KEY");

            // Configure the SDK options
            const options = {
              session_id: "a7fac865-61a9-4589-b80c....", // Replace with your session ID from Step 1
              brand: {
                name: "MoneyApp", // Your business or app name
                logo_url: "https://example.com/your_logo", // Publicly accessible URL of your logo
              },
              theme: {
                mode: "light", // Options: "light" or "dark"
                seed: "#3D6838", // Primary color for theme customization
              },
            };

            // Launch the DigiLocker SDK
            DigilockerSDK.open(options);
          }
        </script>

        <button onclick="launch()">Fetch with DigiLocker</button>
        ```
      </Accordion>

      <Accordion title="2.2 SDK Options" defaultOpen>
        ```json  theme={null}
        {
          "session_id": "a7fac865-61a9-4589-b80c....",
          "brand": {
            "name": "MoneyApp",
            "logo_url": "https://example.com/your_logo"
          },
          "theme": {
            "mode": "light",
            "seed": "#3D6838"
          }
        }
        ```

        <ParamField body="session_id" type="string" required placeholder="a7fac865-61a9-4589-b80c....">
          Unique session id generated when Create Session API is called.
        </ParamField>

        <ParamField body="brand" type="object" required>
          Configuration for branding displayed in the DigiLocker interface.

          <Expandable title="child attributes">
            <ParamField body="name" type="string" required>
              Display name of your business or app shown during the DigiLocker flow.
            </ParamField>

            <ParamField body="logo_url" type="string" required>
              Publicly accessible HTTPS URL of your logo displayed within the SDK.
            </ParamField>
          </Expandable>
        </ParamField>

        <ParamField body="theme" type="object" required>
          Appearance configuration for the SDK.

          <Expandable title="child attributes">
            <ParamField body="mode" type="string" required>
              Sets the overall appearance of the SDK. Accepts `"light"` or `"dark"`.
            </ParamField>

            <ParamField body="seed" type="string" required>
              Primary brand color used in the SDK interface. Accepts a hex code.
            </ParamField>
          </Expandable>
        </ParamField>
      </Accordion>
    </AccordionGroup>
  </Step>

  <Step title="Handle Session Success and Failure" titleSize="h2">
    After a user interacts with the DigiLocker SDK, various **events** are emitted that indicate the outcome of the session — whether it succeeded, failed, or was canceled.

    Your event listener (defined earlier) receives these events. You can handle them as follows:

    ```javascript  theme={null}
    const handleEvent = (event) => {
      console.log("Event received:", event);
      
      switch (event.type) {
        case "in.co.sandbox.kyc.digilocker_sdk.session.completed":
          // The documents were fetched from digilocker successfully
          // Proceed with your application flow
          break;

        case "in.co.sandbox.kyc.digilocker_sdk.session.closed":
          // The user closed or exited out of the sdk
          break;

        default:
          console.log("Unhandled event:", event);
      }
    };
    ```

    To programmatically verify the final status of a session, you can call the  [Session Status](../../endpoints/get-session-status) endpoint from your backend.

    This is useful for confirming completion or troubleshooting unexpected results, especially in cases where the client event might have been interrupted.
  </Step>
</Steps>


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt










# Create Session

<Card title="Run in Postman" icon="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=bf60d58751a51f6e80a8f2cdae74c9fc" horizontal arrow="true" href="https://www.postman.com/in-co-sandbox/sandbox-api/request/rupyji9/create-session" data-og-width="2030" width="2030" data-og-height="2031" height="2031" data-path="static/svg/Postman.svg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=280&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=a8161d9ab4b0cbfbfe9ce7d86a953ab4 280w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=560&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=692bb76a5da8bde417a42bc8e3fb3d12 560w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=840&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=22185eb59762467866dfd7ae89f04c61 840w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1100&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=3dfce096efd8f3686e007202e961864f 1100w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1650&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=d763125fec4e71e4017b4c47d2815420 1650w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=2500&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=1a03ffbeed1528dff8f272382c72a0d0 2500w" />


## OpenAPI

````yaml api-reference/kyc/openapi.json post /kyc/digilocker-sdk/sessions/create
openapi: 3.1.0
info:
  title: KYC
  version: 1.0.0
  description: ''
servers:
  - url: https://api.sandbox.co.in
  - url: https://test-api.sandbox.co.in
security: []
paths:
  /kyc/digilocker-sdk/sessions/create:
    post:
      tags:
        - DigiLocker
        - DigiLocker SDK
      summary: Create Session
      parameters:
        - name: Authorization
          in: header
          required: true
          description: JWT access token
          schema:
            deprecated: false
            type: string
        - name: x-api-key
          in: header
          required: true
          description: API key for identification
          schema:
            deprecated: false
            type: string
        - name: x-api-version
          in: header
          required: false
          schema:
            deprecated: false
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                '@entity':
                  type: string
                  const: in.co.sandbox.kyc.digilocker.sdk.session.request
                flow:
                  description: >-
                    Indicates whether the user is signing in or signing up on
                    DigiLocker
                  type: string
                  enum:
                    - signin
                    - signup
                doc_types:
                  description: Documents you need consent for.
                  type: array
                  items:
                    type: string
                    enum:
                      - aadhaar
                      - driving_license
                      - pan
      responses:
        '200':
          description: 200 - OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  timestamp:
                    type: integer
                  transaction_id:
                    type: string
                  data:
                    type: object
                    properties:
                      '@entity':
                        type: string
                        const: in.co.sandbox.kyc.digilocker.sdk.session
                      id:
                        description: Session ID
                        type: string
                        format: uuid
                      status:
                        description: Status of the Session
                        type: string
                        enum:
                          - created
                      created_at:
                        type: integer
                  code:
                    type: integer
              examples:
                200 - OK:
                  value:
                    timestamp: 1750331120324
                    transaction_id: 5ccad959-0bf4-4472-a3dd-d57e2b61b5a9
                    data:
                      '@entity': in.co.sandbox.kyc.digilocker.sdk.session
                      id: 0454f149-26d0-41ef-9f14-c54f4b5f7b70
                      status: created
                      created_at: 1750331120324
                    code: 200
        '400':
          description: 400 - Bad Request
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  timestamp:
                    type: integer
                  message:
                    type: string
                    enum:
                      - Invalid request body
                  transaction_id:
                    type: string
              examples:
                400 - Invalid request body:
                  value:
                    code: 400
                    timestamp: 1760426007752
                    message: Invalid request body
                    transaction_id: f654ccdb-919f-486d-851d-0fc5d0050c17

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt




# Get Session Status

> Description of your new file.

<Card title="Run in Postman" icon="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=bf60d58751a51f6e80a8f2cdae74c9fc" horizontal arrow="true" href="https://www.postman.com/in-co-sandbox/sandbox-api/request/5y7xuuq/session-status" data-og-width="2030" width="2030" data-og-height="2031" height="2031" data-path="static/svg/Postman.svg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=280&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=a8161d9ab4b0cbfbfe9ce7d86a953ab4 280w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=560&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=692bb76a5da8bde417a42bc8e3fb3d12 560w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=840&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=22185eb59762467866dfd7ae89f04c61 840w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1100&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=3dfce096efd8f3686e007202e961864f 1100w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1650&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=d763125fec4e71e4017b4c47d2815420 1650w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=2500&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=1a03ffbeed1528dff8f272382c72a0d0 2500w" />


## OpenAPI

````yaml api-reference/kyc/openapi.json get /kyc/digilocker-sdk/sessions/{session_id}/status
openapi: 3.1.0
info:
  title: KYC
  version: 1.0.0
  description: ''
servers:
  - url: https://api.sandbox.co.in
  - url: https://test-api.sandbox.co.in
security: []
paths:
  /kyc/digilocker-sdk/sessions/{session_id}/status:
    parameters:
      - name: session_id
        in: path
        required: true
        description: SDK session created in Create Session API
        schema:
          deprecated: false
          type: string
          format: uuid
    get:
      tags:
        - DigiLocker
        - DigiLocker SDK
      summary: Session Status
      parameters:
        - name: Authorization
          in: header
          required: true
          description: JWT access token
          schema:
            deprecated: false
            type: string
        - name: x-api-key
          in: header
          required: true
          description: API key for identification
          schema:
            deprecated: false
            type: string
        - name: x-api-version
          in: header
          required: false
          schema:
            deprecated: false
      responses:
        '200':
          description: 200 - OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  timestamp:
                    type: integer
                  data:
                    type: object
                    properties:
                      '@entity':
                        type: string
                        const: in.co.sandbox.kyc.digilocker.sdk.session
                      status:
                        type: string
                        enum:
                          - created
                          - initialized
                          - authorized
                          - succeeded
                          - failed
                          - expired
                      documents_consented:
                        type: array
                        items:
                          type: string
                          enum:
                            - aadhaar
                            - pan
                            - driving_license
                      id:
                        type: string
                      created_at:
                        type: integer
                      updated_at:
                        type: integer
                  transaction_id:
                    type: string
              examples:
                200 - Session Created:
                  value:
                    code: 200
                    timestamp: 1752580258171
                    data:
                      id: 839fd8a0-d645-42e1-a904-bb43353b0139
                      created_at: 1752579445983
                      '@entity': in.co.sandbox.kyc.digilocker.sdk.session
                      status: created
                    transaction_id: 800ff751-2191-4b7d-b20a-8301790a3e19
                200 - Session Expired:
                  value:
                    code: 200
                    timestamp: 1752580258171
                    data:
                      id: 839fd8a0-d645-42e1-a904-bb43353b0139
                      created_at: 1752579445983
                      updated_at: 1752579445983
                      '@entity': in.co.sandbox.kyc.digilocker.sdk.session
                      status: expired
                    transaction_id: 800ff751-2191-4b7d-b20a-8301790a3e19
                200 - Session Succeeded:
                  value:
                    code: 200
                    timestamp: 1754991910851
                    data:
                      '@entity': in.co.sandbox.kyc.digilocker.sdk.session
                      status: succeeded
                      documents_consented:
                        - aadhaar
                        - pan
                      id: 5ed01344-d9b2-4b44-b0c7-e2901c834999
                      created_at: 1754990307997
                      updated_at: 1754990726406
                    transaction_id: f29f1438-79e2-4090-854e-815d00620bd6
                200 - 200 - Session Created 1:
                  value:
                    code: 200
                    timestamp: 1752580258171
                    data:
                      id: 839fd8a0-d645-42e1-a904-bb43353b0139
                      created_at: 1752579445983
                      '@entity': in.co.sandbox.kyc.digilocker.sdk.session
                      status: created
                    transaction_id: 800ff751-2191-4b7d-b20a-8301790a3e19

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt







# Get Document

> Description of your new file.

<Card title="Run in Postman" icon="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=bf60d58751a51f6e80a8f2cdae74c9fc" horizontal arrow="true" href="https://www.postman.com/in-co-sandbox/sandbox-api/request/hfrm2iu/get-document" data-og-width="2030" width="2030" data-og-height="2031" height="2031" data-path="static/svg/Postman.svg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=280&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=a8161d9ab4b0cbfbfe9ce7d86a953ab4 280w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=560&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=692bb76a5da8bde417a42bc8e3fb3d12 560w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=840&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=22185eb59762467866dfd7ae89f04c61 840w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1100&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=3dfce096efd8f3686e007202e961864f 1100w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1650&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=d763125fec4e71e4017b4c47d2815420 1650w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=2500&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=1a03ffbeed1528dff8f272382c72a0d0 2500w" />

<Info>
  A document can only be fetched if the user has provided consent for it.
</Info>


## OpenAPI

````yaml api-reference/kyc/openapi.json get /kyc/digilocker-sdk/sessions/{session_id}/documents/{doc_type}
openapi: 3.1.0
info:
  title: KYC
  version: 1.0.0
  description: ''
servers:
  - url: https://api.sandbox.co.in
  - url: https://test-api.sandbox.co.in
security: []
paths:
  /kyc/digilocker-sdk/sessions/{session_id}/documents/{doc_type}:
    parameters:
      - name: session_id
        in: path
        required: true
        description: SDK session created in Create Session API
        schema:
          deprecated: false
          type: string
          format: uuid
      - name: doc_type
        in: path
        required: true
        description: Document you want to fetch
        schema:
          deprecated: false
          type: string
          enum:
            - aadhaar
            - driving_license
            - pan
    get:
      tags:
        - DigiLocker
        - DigiLocker SDK
      summary: Get Document
      parameters:
        - name: Authorization
          in: header
          required: true
          description: JWT access token
          schema:
            deprecated: false
            type: string
        - name: x-api-key
          in: header
          required: true
          description: API key for identification
          schema:
            deprecated: false
            type: string
        - name: x-api-version
          in: header
          required: false
          schema:
            type: string
      responses:
        '200':
          description: 200 - OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  timestamp:
                    type: integer
                  data:
                    type: object
                    properties:
                      files:
                        type: array
                        items:
                          type: object
                          properties:
                            '@entity':
                              type: string
                              const: org.quicko.drive.file
                            url:
                              type: string
                              format: uri
                            size:
                              type: integer
                            metadata:
                              type: object
                              properties:
                                ContentType:
                                  type: string
                                issuer_id:
                                  type: string
                                issuer:
                                  type: string
                                LastModified:
                                  type: string
                                description:
                                  type: string
                  transaction_id:
                    type: string
              examples:
                200 - OK:
                  value:
                    code: 200
                    timestamp: 1751975529441
                    data:
                      files:
                        - '@entity': org.quicko.drive.file
                          url: >-
                            https://in-co-sandbox-kyc-digilocker-dev.s3.ap-south-1.amazonaws.com/non-persistent/e385432b-575c-4b6f-8928-79136dbc0d4f/4b4bf7aa-f4da-47a8-9b32-895edfc03630/in.gov.uidai-ADHAR-0d5fe4d692c73e23c59a694eaaabc75a.xml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=null%2F20250708%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20250708T115214Z&X-Amz-Expires=3600&X-Amz-Signature=8cc4b0e8eb3794601c7fdb7e85f3a6bb3a8e1842403c8aeae5c05b7af03bdadb&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
                          size: 16598
                          metadata:
                            ContentType: application/xml
                            issuer_id: in.gov.uidai
                            issuer: Unique Identification Authority of India (UIDAI)
                            LastModified: 09/05/2025
                            description: Aadhaar Card
                    transaction_id: a4d43b74-0f9c-480c-9300-f011100b674b
        '400':
          description: 400 - Bad Request
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  timestamp:
                    type: integer
                  transaction_id:
                    type: string
                  message:
                    type: string
              examples:
                400 - Consent not provided:
                  value:
                    code: 400
                    timestamp: 1760432035872
                    message: Consent for pan not provided
                    transaction_id: 3d1d2d37-3179-4a3c-8397-2287084d1de1
        '521':
          description: 521 - Data Not Found
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  timestamp:
                    type: integer
                  transaction_id:
                    type: string
                  message:
                    type: string
              examples:
                521 - Data Not Found:
                  value:
                    code: 521
                    timestamp: 1760428752393
                    message: 'Data not found for: 839fd8a0-d645-42e1-a904-bb43353b0139'
                    transaction_id: 8be099b1-8d19-457e-b907-5b825740d9cc
        '523':
          description: 523 - Invalid Lifecycle
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  timestamp:
                    type: integer
                  transaction_id:
                    type: string
                  message:
                    type: string
              examples:
                523 - Invalid Session Lifecycle:
                  value:
                    code: 523
                    timestamp: 1760431743347
                    message: Cannot get document due to invalid session lifecycle
                    transaction_id: 031c9d24-99c4-49cb-b4ba-11e8c3630f9f

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt