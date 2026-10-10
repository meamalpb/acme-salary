require "rails_helper"

RSpec.describe "Employee imports", type: :request do
  around { |example| travel_to(Time.zone.local(2026, 10, 10, 12), &example) }

  let(:headers) { auth_headers }
  let(:error) { response.parsed_body["error"] }
  let(:valid_csv) do
    "full_name,email,gender,job_title,department,level,country,hire_date,salary\n" \
      "Asha Rao,asha@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,38500\n"
  end

  def upload(text, filename: "staff.csv")
    Rack::Test::UploadedFile.new(StringIO.new(text), "text/csv", original_filename: filename)
  end

  describe "authentication" do
    it "rejects both endpoints without a token" do
      employee_import = create(:employee_import)

      post "/api/v1/employee_imports", params: { file: upload(valid_csv) }
      expect(response).to have_http_status(:unauthorized)
      get "/api/v1/employee_imports/#{employee_import.id}"
      expect(response).to have_http_status(:unauthorized)
      expect(error["code"]).to eq("unauthorized")
    end
  end

  describe "POST /api/v1/employee_imports" do
    it "stores the upload, queues the import and returns 202 with the queued import" do
      user = create(:user)

      post "/api/v1/employee_imports", params: { file: upload(valid_csv) }, headers: auth_headers(user)

      expect(response).to have_http_status(:accepted)
      employee_import = EmployeeImport.last
      expect(employee_import).to have_attributes(user: user, filename: "staff.csv", content: valid_csv)
      expect(ImportEmployeesJob).to have_been_enqueued.with(employee_import)
      expect(response.parsed_body).to eq(
        "id" => employee_import.id, "status" => "queued", "filename" => "staff.csv", "created_count" => 0,
        "row_errors" => [], "error_message" => nil, "created_at" => "2026-10-10T12:00:00.000Z"
      )
      expect(Employee.count).to eq(0)
    end

    it "lets the client poll until the import has run" do
      post "/api/v1/employee_imports", params: { file: upload(valid_csv) }, headers: headers
      id = response.parsed_body["id"]

      perform_enqueued_jobs
      get "/api/v1/employee_imports/#{id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("status" => "succeeded", "created_count" => 1, "row_errors" => [],
                                              "error_message" => nil)
      expect(Employee.pluck(:email)).to eq [ "asha@acme.test" ]
    end

    it "accepts a file with invalid rows, and reports them once the import has run" do
      text = "#{valid_csv}Ben Ode,ben@acme.test,male,Backend Engineer,engineering,senior,india,2021-03-15,0\n"

      post "/api/v1/employee_imports", params: { file: upload(text) }, headers: headers
      expect(response).to have_http_status(:accepted)
      perform_enqueued_jobs
      get "/api/v1/employee_imports/#{response.parsed_body['id']}", headers: headers

      expect(response.parsed_body).to include(
        "status" => "failed",
        "created_count" => 0,
        "row_errors" => [ { "row" => 3, "errors" => { "salary" => [ "must be greater than 0" ] } } ]
      )
      expect(Employee.count).to eq(0)
    end

    it "returns 422 invalid_file straight away when the whole file is unusable" do
      post "/api/v1/employee_imports", params: { file: upload("") }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(error).to eq("code" => "invalid_file", "message" => "File is empty", "details" => { "file" => [ "is empty" ] })
      expect(EmployeeImport.count).to eq(0)
      expect(ImportEmployeesJob).not_to have_been_enqueued
    end

    it "returns 422 invalid_file for a file over the size limit" do
      stub_const("ImportEmployeesCsv::MAX_BYTES", 100)

      post "/api/v1/employee_imports", params: { file: upload(valid_csv) }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["message"]).to eq("File is larger than 100 Bytes")
    end

    it "returns 422 invalid_file when file is not an uploaded file" do
      post "/api/v1/employee_imports", params: { file: valid_csv }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(error).to include("code" => "invalid_file", "message" => "File must be sent as a file upload")
    end

    it "returns 422 invalid_param when the file is missing" do
      post "/api/v1/employee_imports", params: {}, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(error).to include("code" => "invalid_param", "details" => { "file" => [ "is required" ] })
    end
  end

  describe "GET /api/v1/employee_imports/:id" do
    it "returns an import uploaded by any HR user" do
      employee_import = create(:employee_import, user: create(:user))

      get "/api/v1/employee_imports/#{employee_import.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("id" => employee_import.id, "status" => "queued")
    end

    it "returns 404 not_found for an unknown id" do
      get "/api/v1/employee_imports/0", headers: headers

      expect(response).to have_http_status(:not_found)
      expect(error["code"]).to eq("not_found")
    end
  end
end
