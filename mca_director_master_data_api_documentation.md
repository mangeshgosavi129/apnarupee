# Director Master Data

> Director Master Data API uses Director Identification Number (DIN) to provide details about the existing director of a company, or with the intention to be one.

<Card title="Run in Postman" icon="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=bf60d58751a51f6e80a8f2cdae74c9fc" horizontal arrow="true" href="https://www.postman.com/in-co-sandbox/sandbox-api/request/7r3oogc/director-master-data" data-og-width="2030" width="2030" data-og-height="2031" height="2031" data-path="static/svg/Postman.svg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=280&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=a8161d9ab4b0cbfbfe9ce7d86a953ab4 280w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=560&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=692bb76a5da8bde417a42bc8e3fb3d12 560w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=840&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=22185eb59762467866dfd7ae89f04c61 840w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1100&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=3dfce096efd8f3686e007202e961864f 1100w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1650&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=d763125fec4e71e4017b4c47d2815420 1650w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=2500&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=1a03ffbeed1528dff8f272382c72a0d0 2500w" />


## OpenAPI

````yaml api-reference/kyc/openapi.json post /mca/director/master-data/search
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
  /mca/director/master-data/search:
    post:
      summary: Director Master Data
      operationId: mca-director-master-data-api
      parameters:
        - name: authorization
          in: header
          description: JWT access token
          required: true
          schema:
            type: string
        - name: x-api-key
          in: header
          description: API key for identification
          required: true
          schema:
            type: string
        - name: x-api-version
          in: header
          description: API version
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - '@entity'
                - id
                - reason
                - consent
              properties:
                '@entity':
                  type: string
                  description: Entity name
                  default: in.co.sandbox.kyc.mca.master_data.request
                id:
                  type: string
                  description: >-
                    8-digit unique identification number, which is allotted by
                    the central government to each individual who is a director
                    of any company
                reason:
                  type: string
                  description: >-
                    Purpose for which the user has given their consent. Min
                    length: 20 characters
                consent:
                  type: string
                  description: >-
                    Consent of the end-user to get their information for
                    verification purposes. Possible values: Y and y
            examples:
              Request Example:
                value:
                  '@entity': in.co.sandbox.kyc.mca.master_data.request
                  id: '9999999'
                  consent: 'y'
                  reason: for KYC
      responses:
        '200':
          description: 200 - OK
          content:
            application/json:
              examples:
                Result:
                  value:
                    code: 200
                    timestamp: 1614696176218
                    transaction_id: 611335dc-8be4-40d1-8438-b86526462939
                    data:
                      '@entity': in.co.sandbox.kyc.mca.director
                      director_data:
                        '@entity': in.co.sandbox.kyc.mca.director.director_data
                        din: '99999999'
                        name: JOHN DOE
                      llp_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-1234
                      company_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.company_data
                          end_date: '-'
                          company_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          cin/fcrn: U12300GJ2015PTC123456
                        - '@entity': in.co.sandbox.kyc.mca.director.company_data
                          end_date: '-'
                          designation: Director
                          company_name: JD PRIVATE LIMITED
                          begin_date: 09/06/2017
                          cin/fcrn: U12300GJ2017PTC123456
                success:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: 317b9dbd-5a79-425e-b921-9ae41eb778be
                    data:
                      '@entity': in.co.sandbox.kyc.mca.director
                      director_data:
                        '@entity': in.co.sandbox.kyc.mca.director.director_data
                        din: '99999999'
                        name: JOHN DOE
                      llp_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-1234
                      company_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.company_data
                          end_date: '-'
                          company_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          cin/fcrn: U12300GJ2015PTC123456
                        - '@entity': in.co.sandbox.kyc.mca.director.company_data
                          end_date: '-'
                          designation: Director
                          company_name: JD PRIVATE LIMITED
                          begin_date: 09/06/2017
                          cin/fcrn: U12300GJ2017PTC123456
                success 2:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: 4bd2a554-63e4-4602-be5e-1e86242301d2
                    data:
                      '@entity': in.co.sandbox.kyc.mca.director
                      director_data:
                        '@entity': in.co.sandbox.kyc.mca.director.director_data
                        din: '99967999'
                        name: JACK DOE
                      llp_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-1234
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: ARJUN DOE CONSULTING LLP
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-4567
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: PRIYA DOE CONSULTING LLP
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: XXX-4567
                      company_data: []
                success 3:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: 97c1b418-4f7a-4cd3-9d40-91800218c76b
                    data:
                      '@entity': in.co.sandbox.kyc.mca.director
                      director_data:
                        '@entity': in.co.sandbox.kyc.mca.director.director_data
                        din: '99963999'
                        name: JANE DOE
                      llp_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: JOHN DOE PRIVATE LIMITED
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-1234
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: ARJUN DOE CONSULTING LLP
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-4567
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: PRIYA DOE CONSULTING LLP
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: XXX-4567
                      company_data: []
                200 - Success:
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: 6f871172-8195-4ee1-ac6f-81483776476c
                    data:
                      '@entity': in.co.sandbox.kyc.mca.director
                      director_data:
                        '@entity': in.co.sandbox.kyc.mca.director.director_data
                        din: '99999999'
                        name: JOHN DOE
                      llp_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-1234
                      company_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.company_data
                          end_date: '-'
                          company_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          cin/fcrn: U12300GJ2015PTC123456
                        - '@entity': in.co.sandbox.kyc.mca.director.company_data
                          end_date: '-'
                          designation: Director
                          company_name: JD PRIVATE LIMITED
                          begin_date: 09/06/2017
                          cin/fcrn: U12300GJ2017PTC123456
                200 - 200 - Success 1:
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: 772b9922-cbbb-4e31-879e-fc206e474a62
                    data:
                      '@entity': in.co.sandbox.kyc.mca.director
                      director_data:
                        '@entity': in.co.sandbox.kyc.mca.director.director_data
                        din: '99967999'
                        name: JACK DOE
                      llp_data:
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: JOHN DOE PRIVATE LIMITED
                          designation: Director
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-1234
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: ARJUN DOE CONSULTING LLP
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: ABC-4567
                        - '@entity': in.co.sandbox.kyc.mca.director.llp_data
                          end_date: '-'
                          llp_name: PRIYA DOE CONSULTING LLP
                          designation: Designated Partner
                          begin_date: 19/03/2015
                          llpin/fllpin: XXX-4567
                      company_data: []
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    example: 200
                    default: 0
                  timestamp:
                    type: integer
                    example: 1614696176218
                    default: 0
                  transaction_id:
                    type: string
                    example: 611335dc-8be4-40d1-8438-b86526462939
                  data:
                    type: object
                    properties:
                      '@entity':
                        type: string
                        example: in.co.sandbox.kyc.mca.director
                      director_data:
                        type: object
                        properties:
                          '@entity':
                            type: string
                            example: in.co.sandbox.kyc.mca.director.director_data
                          din:
                            type: string
                            example: '99999999'
                          name:
                            type: string
                            example: JOHN DOE
                      llp_data:
                        type: array
                        items:
                          type: object
                          properties:
                            '@entity':
                              type: string
                              example: in.co.sandbox.kyc.mca.director.llp_data
                            end_date:
                              type: string
                              example: '-'
                            llp_name:
                              type: string
                              example: JOHN DOE PRIVATE LIMITED
                            designation:
                              type: string
                              example: Director
                            begin_date:
                              type: string
                              example: 19/03/2015
                            llpin/fllpin:
                              type: string
                              example: ABC-1234
                      company_data:
                        type: array
                        items:
                          type: object
                          properties:
                            '@entity':
                              type: string
                              example: in.co.sandbox.kyc.mca.director.company_data
                            end_date:
                              type: string
                              example: '-'
                            company_name:
                              type: string
                              example: JOHN DOE PRIVATE LIMITED
                            designation:
                              type: string
                              example: Director
                            begin_date:
                              type: string
                              example: 19/03/2015
                            cin/fcrn:
                              type: string
                              example: U12300GJ2015PTC123456
        '422':
          description: 422 - Unprocessable Entity
          content:
            application/json:
              examples:
                Please Provide A Valid DIN:
                  value:
                    code: 422
                    timestamp: 1713795968247
                    transaction_id: c53e772b-bb20-43e2-8a65-cd97ca06055e
                    message: >-
                      DIN Entered does not match MCA Records, Please enter a
                      Valid DIN.
                please provide a valid din:
                  value:
                    code: 422
                    message: >-
                      DIN Entered does not match MCA records, Please enter a
                      valid DIN.
                    timestamp: 1763725205000
                    transaction_id: d48a9f81-9eaa-4e26-972f-448b2e82e82c
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    example: 422
                    default: 0
                  timestamp:
                    type: integer
                    example: 1713795968247
                    default: 0
                  transaction_id:
                    type: string
                    example: c53e772b-bb20-43e2-8a65-cd97ca06055e
                  message:
                    type: string
                    example: >-
                      DIN Entered does not match MCA Records, Please enter a
                      Valid DIN.
      deprecated: false
      security: []

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt