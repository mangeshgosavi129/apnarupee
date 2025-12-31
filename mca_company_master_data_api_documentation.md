# Company Master Data

> API takes in the Corporate Identification Number (CIN) to identify and retrieve basic information about the company.

<Card title="Run in Postman" icon="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=bf60d58751a51f6e80a8f2cdae74c9fc" horizontal arrow="true" href="https://www.postman.com/in-co-sandbox/sandbox-api/request/yqhb2j6/company-master-data" data-og-width="2030" width="2030" data-og-height="2031" height="2031" data-path="static/svg/Postman.svg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=280&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=a8161d9ab4b0cbfbfe9ce7d86a953ab4 280w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=560&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=692bb76a5da8bde417a42bc8e3fb3d12 560w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=840&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=22185eb59762467866dfd7ae89f04c61 840w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1100&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=3dfce096efd8f3686e007202e961864f 1100w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=1650&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=d763125fec4e71e4017b4c47d2815420 1650w, https://mintcdn.com/sandboxfinancialtechnologiesprivatelimited/E4RwGFBROD75hm3P/static/svg/Postman.svg?w=2500&fit=max&auto=format&n=E4RwGFBROD75hm3P&q=85&s=1a03ffbeed1528dff8f272382c72a0d0 2500w" />


## OpenAPI

````yaml api-reference/kyc/openapi.json post /mca/company/master-data/search
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
  /mca/company/master-data/search:
    post:
      summary: Company Master Data
      operationId: mca-company-master-data-api
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - '@entity'
                - id
                - consent
                - reason
              properties:
                '@entity':
                  type: string
                  description: entity name
                  default: in.co.sandbox.kyc.mca.master_data.request
                id:
                  type: string
                  description: >-
                    21 characters alpha-numeric unique identification code,
                    which is allotted by the central government to each company
                    or 7 characters alpha-numeric unique identification code
                    issued to LLP
                consent:
                  type: string
                  description: >-
                    Consent of the end-user to get their information for
                    verification purposes. Possible values: Y and y
                reason:
                  type: string
                  description: Purpose for which the user has given their consent.
            examples:
              Request Example:
                value:
                  '@entity': in.co.sandbox.kyc.mca.master_data.request
                  id: U12345AB1234ABC123456
                  consent: 'y'
                  reason: for KYC
      responses:
        '200':
          description: 200 - OK
          content:
            application/json:
              examples:
                CIN:
                  value:
                    code: 200
                    timestamp: 1614696176218
                    transaction_id: 611335dc-8be4-40d1-8438-b86526462939
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: john@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: >-
                          123, ABC LAKEVIEW TOWER OPPOSITE A COMPLEX, AHMEDABAD
                          Ahmedabad GJ 380015 IN
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12300GJ2017PTC123456
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Ahmedabad
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: JOHN DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
                ' LLPIN':
                  value:
                    code: 200
                    timestamp: 1614696176218
                    transaction_id: 611335dc-8be4-40d1-8438-b86526462939
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: jane@doe.com
                        registered_address: 1234, WILSON GARDEN BANGALORE Bangalore KA 560027 IN
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: XXX-0123
                        roc_code: RoC-Bangalore
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: JANE DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                      balance_sheets:
                        - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                          date_of_filing: 31/03/2023
                          financial_year: 31/03/2023
                        - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                          date_of_filing: 31/03/2022
                          financial_year: 31/03/2022
                      annual_returns:
                        - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                          date_of_filing: 31/03/2023
                          financial_year: 31/03/2023
                success (LLP):
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: 843d573d-b7c8-44b5-b8b0-e89507500967
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: jane@doe.com
                        registered_address: 1234, WILSON GARDEN BANGALORE Bangalore KA 560027 IN
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: ABC-1234
                        roc_code: RoC-Bangalore
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: JANE DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                        balance_sheets:
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2022
                            financial_year: 31/03/2022
                        annual_returns:
                          - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                success (LLP) 2:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: c7933846-fd30-40a3-916e-c3fc70d398a7
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: arjun@doe.com
                        registered_address: 48, SNEH NAGAR, PUNE, MAHARASHTRA, 400001
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: ABC-4567
                        roc_code: RoC-Delhi
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: ARJUN DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                        balance_sheets:
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2022
                            financial_year: 31/03/2022
                        annual_returns:
                          - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                success (LLP) 3:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: f3057d1f-f49d-4eef-a531-5eda5262829b
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: priya@doe.com
                        registered_address: 82, BAPU ROAD, CHEENAI, TAMIL NADU, 600001
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: XXX-4567
                        roc_code: RoC-Cheenai
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: PRIYA DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                        balance_sheets:
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2022
                            financial_year: 31/03/2022
                        annual_returns:
                          - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                success (company):
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: 00f6ba9f-beb4-4604-a297-db09efee6e59
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: john@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: >-
                          123, ABC LAKEVIEW TOWER OPPOSITE A COMPLEX, AHMEDABAD
                          Ahmedabad GJ 380015 IN
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12345AB1234ABC123456
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Ahmedabad
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: JOHN DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        main_division_of_business_activity_to_be_carried_out_in_india: '72'
                        previous_firm/_company_details,_if_applicable: ''
                        number_of_designated_partners: ''
                        total_obligation_of_contribution: '0'
                        description_of_main_division: REAL ESTATE,RENTING AND BUSINESS ACTIVITIES
                        number_of_partners: ''
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
                success (company) 2:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: a45b8314-da66-4ad0-891f-3ad2a968c63a
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: rahul@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: 15, ASHOK VIHAR, RAJOT, GUJARAT, 700001
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12345AB1234ABC456789
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Rajkot
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: RAHUL DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        main_division_of_business_activity_to_be_carried_out_in_india: '72'
                        previous_firm/_company_details,_if_applicable: ''
                        number_of_designated_partners: ''
                        total_obligation_of_contribution: '0'
                        description_of_main_division: REAL ESTATE,RENTING AND BUSINESS ACTIVITIES
                        number_of_partners: ''
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
                success (company) 3:
                  value:
                    code: 200
                    timestamp: 1763725205000
                    transaction_id: 26d48061-20e9-4a5b-a9aa-4d632dd87a18
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: vikram@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: 30, RAJA GARDEN, BANGALORE, KARNATAKA, 560001
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12345AB1234ABC789789
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Bangalore
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: VIKRAM DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        main_division_of_business_activity_to_be_carried_out_in_india: '72'
                        previous_firm/_company_details,_if_applicable: ''
                        number_of_designated_partners: ''
                        total_obligation_of_contribution: '0'
                        description_of_main_division: REAL ESTATE,RENTING AND BUSINESS ACTIVITIES
                        number_of_partners: ''
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
                200 - Success (LLP):
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: 01ed81a7-72d0-4267-b074-41f56004aebb
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: jane@doe.com
                        registered_address: 1234, WILSON GARDEN BANGALORE Bangalore KA 560027 IN
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: ABC-1234
                        roc_code: RoC-Bangalore
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: JANE DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                        balance_sheets:
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2022
                            financial_year: 31/03/2022
                        annual_returns:
                          - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                200 - Success (LLP) 2:
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: 10daf614-1b2a-429e-ba87-b24b21644b8d
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: arjun@doe.com
                        registered_address: 48, SNEH NAGAR, PUNE, MAHARASHTRA, 400001
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: ABC-4567
                        roc_code: RoC-Delhi
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: ARJUN DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                        balance_sheets:
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2022
                            financial_year: 31/03/2022
                        annual_returns:
                          - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                200 - Success (LLP) 3:
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: cc88e570-82ec-403e-92ba-f2a2ec07e137
                    data:
                      '@entity': in.co.sandbox.kyc.mca.llp
                      llp_master_data:
                        '@entity': in.co.sandbox.kyc.mca.llp.master_data
                        email_id: priya@doe.com
                        registered_address: 82, BAPU ROAD, CHEENAI, TAMIL NADU, 600001
                        main_division_of_business_activity_to_be_carried_out_in_india: '74'
                        previous_firm/_company_details,_if_applicable: ''
                        llpin: XXX-4567
                        roc_code: RoC-Cheenai
                        number_of_designated_partners: '2'
                        date_of_incorporation: 24/04/2009
                        llp_name: PRIYA DOE CONSULTING LLP
                        total_obligation_of_contribution: '15000'
                        llp_status: Active
                        description_of_main_division: Other Business Activities
                        number_of_partners: '0'
                        llp_strike_off/_amalgamated_date: ''
                        status_under_cirp: ''
                        rd_region: RD South East Region
                        balance_sheets:
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                          - '@entity': in.co.sandbox.kyc.mca.llp.balance_sheet
                            date_of_filing: 31/03/2022
                            financial_year: 31/03/2022
                        annual_returns:
                          - '@entity': in.co.sandbox.kyc.mca.llp.annual_return
                            date_of_filing: 31/03/2023
                            financial_year: 31/03/2023
                      charges: []
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99963999'
                          begin_date: 31/03/2010
                          name: JANE DOE
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.llp.directors_signatory_details
                          end_date: '-'
                          designation: Designated Partner
                          din/pan: '99967999'
                          begin_date: 31/03/2010
                          name: JACK DOE
                200 - Success (company):
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: e5b56dad-d33a-44da-ae98-be31318e47bc
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: john@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: >-
                          123, ABC LAKEVIEW TOWER OPPOSITE A COMPLEX, AHMEDABAD
                          Ahmedabad GJ 380015 IN
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12345AB1234ABC123456
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Ahmedabad
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: JOHN DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        main_division_of_business_activity_to_be_carried_out_in_india: '72'
                        previous_firm/_company_details,_if_applicable: ''
                        number_of_designated_partners: ''
                        total_obligation_of_contribution: '0'
                        description_of_main_division: REAL ESTATE,RENTING AND BUSINESS ACTIVITIES
                        number_of_partners: ''
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
                200 - Success (company) 2:
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: 3d7947b5-5d4f-42f3-9314-f2c4d1d79433
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: rahul@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: 15, ASHOK VIHAR, RAJOT, GUJARAT, 700001
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12345AB1234ABC456789
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Rajkot
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: RAHUL DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        main_division_of_business_activity_to_be_carried_out_in_india: '72'
                        previous_firm/_company_details,_if_applicable: ''
                        number_of_designated_partners: ''
                        total_obligation_of_contribution: '0'
                        description_of_main_division: REAL ESTATE,RENTING AND BUSINESS ACTIVITIES
                        number_of_partners: ''
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
                200 - Success (company) 3:
                  value:
                    code: 200
                    timestamp: 1765889766000
                    transaction_id: 84b173fb-9e21-45bb-89de-7852190ff8e4
                    data:
                      '@entity': in.co.sandbox.kyc.mca.company
                      company_master_data:
                        '@entity': in.co.sandbox.kyc.mca.company.master_data
                        company_category: Company limited by Shares
                        email_id: vikram@doe.com
                        class_of_company: Private
                        date_of_last_agm: 30/09/2019
                        registered_address: 30, RAJA GARDEN, BANGALORE, KARNATAKA, 560001
                        registration_number: '999999'
                        paid_up_capital(rs): '100000'
                        whether_listed_or_not: Unlisted
                        suspended_at_stock_exchange: '-'
                        cin: U12345AB1234ABC789789
                        company_subcategory: Non-govt company
                        authorised_capital(rs): '100000'
                        company_status(for_efiling): Active
                        roc_code: RoC-Bangalore
                        date_of_balance_sheet: 31/03/2019
                        date_of_incorporation: 09/06/2017
                        company_name: VIKRAM DOE PRIVATE LIMITED
                        active_compliance: ACTIVE Compliant
                        rd_region: RD South East Region
                        main_division_of_business_activity_to_be_carried_out_in_india: '72'
                        previous_firm/_company_details,_if_applicable: ''
                        number_of_designated_partners: ''
                        total_obligation_of_contribution: '0'
                        description_of_main_division: REAL ESTATE,RENTING AND BUSINESS ACTIVITIES
                        number_of_partners: ''
                        balance_sheets: []
                        annual_returns: []
                      charges:
                        - '@entity': in.co.sandbox.kyc.mca.company.charges
                          date_of_creation: 06/02/2019
                          date_of_modification: '-'
                          charge_amount: '2000000000'
                          status: Closed
                      directors/signatory_details:
                        - '@entity': >-
                            in.co.sandbox.kyc.mca.company.directors_signatory_details
                          end_date: '-'
                          din/pan: '99999999'
                          begin_date: 09/06/2017
                          designation: Director
                          name: JOHN DOE
              schema:
                oneOf:
                  - title: CIN
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
                            example: in.co.sandbox.kyc.mca.company
                          company_master_data:
                            type: object
                            properties:
                              '@entity':
                                type: string
                                example: in.co.sandbox.kyc.mca.company.master_data
                              company_category:
                                type: string
                                example: Company limited by Shares
                              email_id:
                                type: string
                                example: john@doe.com
                              class_of_company:
                                type: string
                                example: Private
                              date_of_last_agm:
                                type: string
                                example: 30/09/2019
                              registered_address:
                                type: string
                                example: >-
                                  123, ABC LAKEVIEW TOWER OPPOSITE A COMPLEX,
                                  AHMEDABAD Ahmedabad GJ 380015 IN
                              registration_number:
                                type: string
                                example: '999999'
                              paid_up_capital(rs):
                                type: string
                                example: '100000'
                              whether_listed_or_not:
                                type: string
                                example: Unlisted
                              suspended_at_stock_exchange:
                                type: string
                                example: '-'
                              cin:
                                type: string
                                example: U12300GJ2017PTC123456
                              company_subcategory:
                                type: string
                                example: Non-govt company
                              authorised_capital(rs):
                                type: string
                                example: '100000'
                              company_status(for_efiling):
                                type: string
                                example: Active
                              roc_code:
                                type: string
                                example: RoC-Ahmedabad
                              date_of_balance_sheet:
                                type: string
                                example: 31/03/2019
                              date_of_incorporation:
                                type: string
                                example: 09/06/2017
                              company_name:
                                type: string
                                example: JOHN DOE PRIVATE LIMITED
                              active_compliance:
                                type: string
                                example: ACTIVE Compliant
                              rd_region:
                                type: string
                                example: RD South East Region
                              balance_sheets:
                                type: array
                                items:
                                  type: object
                                  properties: {}
                              annual_returns:
                                type: array
                                items:
                                  type: object
                                  properties: {}
                          charges:
                            type: array
                            items:
                              type: object
                              properties:
                                '@entity':
                                  type: string
                                  example: in.co.sandbox.kyc.mca.company.charges
                                date_of_creation:
                                  type: string
                                  example: 06/02/2019
                                date_of_modification:
                                  type: string
                                  example: '-'
                                charge_amount:
                                  type: string
                                  example: '2000000000'
                                status:
                                  type: string
                                  example: Closed
                          directors/signatory_details:
                            type: array
                            items:
                              type: object
                              properties:
                                '@entity':
                                  type: string
                                  example: >-
                                    in.co.sandbox.kyc.mca.company.directors_signatory_details
                                end_date:
                                  type: string
                                  example: '-'
                                din/pan:
                                  type: string
                                  example: '99999999'
                                begin_date:
                                  type: string
                                  example: 09/06/2017
                                designation:
                                  type: string
                                  example: Director
                                name:
                                  type: string
                                  example: JOHN DOE
                  - title: ' LLPIN'
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
                            example: in.co.sandbox.kyc.mca.llp
                          llp_master_data:
                            type: object
                            properties:
                              '@entity':
                                type: string
                                example: in.co.sandbox.kyc.mca.llp.master_data
                              email_id:
                                type: string
                                example: jane@doe.com
                              registered_address:
                                type: string
                                example: >-
                                  1234, WILSON GARDEN BANGALORE Bangalore KA
                                  560027 IN
                              main_division_of_business_activity_to_be_carried_out_in_india:
                                type: string
                                example: '74'
                              previous_firm/_company_details,_if_applicable:
                                type: string
                                example: ''
                              llpin:
                                type: string
                                example: XXX-0123
                              roc_code:
                                type: string
                                example: RoC-Bangalore
                              number_of_designated_partners:
                                type: string
                                example: '2'
                              date_of_incorporation:
                                type: string
                                example: 24/04/2009
                              llp_name:
                                type: string
                                example: JANE DOE CONSULTING LLP
                              total_obligation_of_contribution:
                                type: string
                                example: '15000'
                              llp_status:
                                type: string
                                example: Active
                              description_of_main_division:
                                type: string
                                example: Other Business Activities
                              number_of_partners:
                                type: string
                                example: '0'
                              llp_strike_off/_amalgamated_date:
                                type: string
                                example: ''
                              status_under_cirp:
                                type: string
                                example: ''
                              rd_region:
                                type: string
                                example: RD South East Region
                          charges:
                            type: array
                            items:
                              type: object
                              properties: {}
                          directors/signatory_details:
                            type: array
                            items:
                              type: object
                              properties:
                                '@entity':
                                  type: string
                                  example: >-
                                    in.co.sandbox.kyc.mca.llp.directors_signatory_details
                                end_date:
                                  type: string
                                  example: '-'
                                designation:
                                  type: string
                                  example: Designated Partner
                                din/pan:
                                  type: string
                                  example: '99963999'
                                begin_date:
                                  type: string
                                  example: 31/03/2010
                                name:
                                  type: string
                                  example: JANE DOE
                          balance_sheets:
                            type: array
                            items:
                              type: object
                              properties:
                                '@entity':
                                  type: string
                                  example: in.co.sandbox.kyc.mca.llp.balance_sheet
                                date_of_filing:
                                  type: string
                                  example: 31/03/2023
                                financial_year:
                                  type: string
                                  example: 31/03/2023
                          annual_returns:
                            type: array
                            items:
                              type: object
                              properties:
                                '@entity':
                                  type: string
                                  example: in.co.sandbox.kyc.mca.llp.annual_return
                                date_of_filing:
                                  type: string
                                  example: 31/03/2023
                                financial_year:
                                  type: string
                                  example: 31/03/2023
        '422':
          description: '422'
          content:
            application/json:
              examples:
                Result:
                  value:
                    code: 422
                    timestamp: 1713795996395
                    transaction_id: d4e974ab-0346-44ce-94c8-242076392100
                    message: >-
                      Entered CIN/LLPIN/FLLPIN/FCRN is not found. Please enter
                      valid details.
                not found:
                  value:
                    code: 422
                    timestamp: 1765889766000
                    transaction_id: 47e13aff-e3ba-4cfc-9dde-ceb54fd6864f
                    message: >-
                      Entered CIN/LLPIN/FLLPIN/FCRN is not found. Please enter
                      valid details.
                Unprocessable Enitity - Invalid Pattern:
                  value:
                    code: 422
                    timestamp: 1763725205000
                    transaction_id: 9356726c-10c6-4793-b2cf-eee9a76a7385
                    message: >-
                      CIN/FCRN/LLPIN/FLLPIN must be of the pattern
                      [ADDDDDAADDDDAAADDDDDD] for CIN, [FDDDDD] for FCRN,
                      [AAA-DDDD] for LLPIN and [FAAA-DDDD] for FLLPIN where A is
                      an alphabet, D is a digit (0-9) and F is a literal F
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    example: 422
                    default: 0
                  timestamp:
                    type: integer
                    example: 1713795996395
                    default: 0
                  transaction_id:
                    type: string
                    example: d4e974ab-0346-44ce-94c8-242076392100
                  message:
                    type: string
                    example: >-
                      Entered CIN/LLPIN/FLLPIN/FCRN is not found. Please enter
                      valid details.
      deprecated: false
      security: []

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developer.sandbox.co.in/llms.txt