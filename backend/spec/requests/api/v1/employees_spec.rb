require "rails_helper"

RSpec.describe "Employees", type: :request do
  around { |example| travel_to(Time.zone.local(2026, 10, 9, 12), &example) }

  let(:headers) { auth_headers }
  let(:error) { response.parsed_body["error"] }

  let(:valid_params) do
    {
      employee: {
        full_name: "Priya Sharma", email: "Priya.Sharma@acme.test", gender: "female",
        job_title: "Backend Engineer", department: "engineering", level: "senior",
        country: "india", hire_date: "2021-03-15", salary: 38_500
      }
    }
  end

  describe "authentication" do
    it "rejects every endpoint without a token" do
      employee = create(:employee)

      get "/api/v1/employees"
      expect(response).to have_http_status(:unauthorized)
      get "/api/v1/employees/#{employee.id}"
      expect(response).to have_http_status(:unauthorized)
      post "/api/v1/employees", params: valid_params, as: :json
      expect(response).to have_http_status(:unauthorized)
      patch "/api/v1/employees/#{employee.id}", params: { employee: { salary: 1 } }, as: :json
      expect(response).to have_http_status(:unauthorized)
      post "/api/v1/employees/#{employee.id}/terminate", as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(error["code"]).to eq("unauthorized")
    end
  end

  describe "GET /api/v1/employees" do
    it "returns the list envelope ordered by name" do
      create(:employee, full_name: "Zed")
      create(:employee, full_name: "Amy")

      get "/api/v1/employees", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].map { |e| e["full_name"] }).to eq(%w[Amy Zed])
      expect(response.parsed_body["meta"]).to eq("page" => 1, "per_page" => 25, "total_count" => 2, "total_pages" => 1)
    end

    it "serializes each employee with the contract keys" do
      create(:employee)

      get "/api/v1/employees", headers: headers

      expect(response.parsed_body["data"].first.keys).to contain_exactly(
        "id", "employee_code", "full_name", "email", "gender", "job_title",
        "department", "level", "country", "hire_date", "salary", "terminated_on"
      )
    end

    it "excludes terminated employees" do
      create(:employee, full_name: "Active")
      create(:employee, full_name: "Gone").update_columns(deleted_at: Time.zone.local(2026, 9, 1))

      get "/api/v1/employees", headers: headers

      expect(response.parsed_body["data"].map { |e| e["full_name"] }).to eq(%w[Active])
    end

    it "paginates" do
      create_list(:employee, 3)

      get "/api/v1/employees", params: { page: 2, per_page: 2 }, headers: headers

      expect(response.parsed_body["data"].size).to eq(1)
      expect(response.parsed_body["meta"]).to eq("page" => 2, "per_page" => 2, "total_count" => 3, "total_pages" => 2)
    end

    it "keeps pages stable when names tie" do
      create_list(:employee, 4, full_name: "Same Name")

      get "/api/v1/employees", params: { page: 1, per_page: 2 }, headers: headers
      first_page = response.parsed_body["data"].map { |e| e["id"] }
      get "/api/v1/employees", params: { page: 2, per_page: 2 }, headers: headers
      second_page = response.parsed_body["data"].map { |e| e["id"] }

      expect(first_page + second_page).to eq(Employee.order(:id).pluck(:id))
    end

    it "returns an empty page past the last one" do
      create(:employee)

      get "/api/v1/employees", params: { page: 5 }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"]).to eq([])
    end

    [ [ "page", "0" ], [ "page", "abc" ], [ "per_page", "0" ], [ "per_page", "101" ], [ "per_page", "x" ] ].each do |param, value|
      it "rejects #{param}=#{value} with 422 invalid_param" do
        get "/api/v1/employees", params: { param => value }, headers: headers

        expect(response).to have_http_status(:unprocessable_content)
        expect(error["code"]).to eq("invalid_param")
        expect(error["details"]).to have_key(param)
      end
    end
  end

  describe "GET /api/v1/employees search, filter and sort" do
    let!(:priya) { create(:employee, full_name: "Priya Sharma", country: "india", level: "senior", salary: 40_000) }
    let!(:john) { create(:employee, full_name: "John Smith", country: "united_states", level: "junior", salary: 90_000) }
    let!(:gone) do
      create(:employee, full_name: "Gone Person", hire_date: Date.new(2020, 1, 1)).tap do |employee|
        employee.update_columns(deleted_at: Time.zone.local(2026, 9, 1))
      end
    end

    def listed_names
      response.parsed_body["data"].map { |e| e["full_name"] }
    end

    it "searches with q" do
      get "/api/v1/employees", params: { q: "smith" }, headers: headers

      expect(listed_names).to eq([ "John Smith" ])
      expect(response.parsed_body["meta"]["total_count"]).to eq(1)
    end

    it "combines filters" do
      get "/api/v1/employees", params: { country: "india", level: "senior" }, headers: headers

      expect(listed_names).to eq([ "Priya Sharma" ])
    end

    it "sorts by salary descending" do
      get "/api/v1/employees", params: { sort: "salary", direction: "desc" }, headers: headers

      expect(listed_names).to eq([ "John Smith", "Priya Sharma" ])
    end

    it "lists terminated employees with status=terminated" do
      get "/api/v1/employees", params: { status: "terminated", sort: "terminated_on" }, headers: headers

      expect(listed_names).to eq([ "Gone Person" ])
      expect(response.parsed_body["data"].first["terminated_on"]).to eq("2026-09-01")
    end

    it "lists active and terminated employees together with status=all" do
      get "/api/v1/employees", params: { status: "all" }, headers: headers

      expect(listed_names).to contain_exactly("Priya Sharma", "John Smith", "Gone Person")
    end

    it "paginates the filtered result" do
      get "/api/v1/employees", params: { country: "india", per_page: 1 }, headers: headers

      expect(response.parsed_body["meta"]).to include("total_count" => 1, "total_pages" => 1)
    end

    it "returns 422 invalid_param naming every bad param" do
      get "/api/v1/employees", params: { country: "atlantis", sort: "email" }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("invalid_param")
      expect(error["details"].keys).to contain_exactly("country", "sort")
    end
  end

  describe "GET /api/v1/employees/:id" do
    it "returns an active employee" do
      employee = create(:employee, full_name: "Priya Sharma")

      get "/api/v1/employees/#{employee.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("id" => employee.id, "full_name" => "Priya Sharma", "terminated_on" => nil)
    end

    it "returns a terminated employee with terminated_on set" do
      employee = create(:employee)
      employee.update_columns(deleted_at: Time.zone.local(2026, 9, 1))

      get "/api/v1/employees/#{employee.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["terminated_on"]).to eq("2026-09-01")
    end

    it "returns 404 not_found for an unknown id" do
      get "/api/v1/employees/0", headers: headers

      expect(response).to have_http_status(:not_found)
      expect(error).to include("code" => "not_found", "message" => be_present)
      expect(error).to have_key("details")
    end
  end

  describe "POST /api/v1/employees" do
    it "creates an employee, assigns the code and returns 201" do
      expect { post "/api/v1/employees", params: valid_params, headers: headers, as: :json }
        .to change(Employee, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include(
        "employee_code" => "EMP-00001", "full_name" => "Priya Sharma",
        "email" => "priya.sharma@acme.test", "salary" => 38_500, "terminated_on" => nil
      )
    end

    it "ignores a client-supplied employee_code" do
      params = { employee: valid_params[:employee].merge(employee_code: "EMP-77777") }

      post "/api/v1/employees", params: params, headers: headers, as: :json

      expect(response.parsed_body["employee_code"]).to eq("EMP-00001")
    end

    it "returns 422 validation_failed with per-field details" do
      create(:employee, email: "priya.sharma@acme.test")
      params = { employee: valid_params[:employee].merge(salary: 0, country: "atlantis") }

      expect { post "/api/v1/employees", params: params, headers: headers, as: :json }
        .not_to change(Employee, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("validation_failed")
      expect(error["details"]).to include(
        "email" => [ "has already been taken" ],
        "salary" => [ "must be greater than 0" ],
        "country" => be_present
      )
    end

    it "returns 422 invalid_param when the employee body is missing" do
      post "/api/v1/employees", params: {}, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("invalid_param")
    end
  end

  describe "PATCH /api/v1/employees/:id" do
    let!(:employee) { create(:employee, salary: 38_500, full_name: "Old Name") }

    it "applies a partial update" do
      patch "/api/v1/employees/#{employee.id}", params: { employee: { salary: 42_000 } }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("salary" => 42_000, "full_name" => "Old Name")
      expect(employee.reload.salary).to eq(42_000)
    end

    it "does not allow changing the employee_code" do
      original = employee.employee_code

      patch "/api/v1/employees/#{employee.id}", params: { employee: { employee_code: "EMP-77777" } }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(employee.reload.employee_code).to eq(original)
    end

    it "returns 422 validation_failed with per-field details" do
      patch "/api/v1/employees/#{employee.id}", params: { employee: { salary: -5, email: "bad" } }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("validation_failed")
      expect(error["details"].keys).to contain_exactly("salary", "email")
      expect(employee.reload.salary).to eq(38_500)
    end

    it "returns 422 employee_terminated for a terminated employee" do
      employee.update_columns(deleted_at: Time.zone.local(2026, 9, 1))

      patch "/api/v1/employees/#{employee.id}", params: { employee: { salary: 42_000 } }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("employee_terminated")
      expect(Employee.with_deleted.find(employee.id).salary).to eq(38_500)
    end

    it "returns 404 for an unknown id" do
      patch "/api/v1/employees/0", params: { employee: { salary: 1 } }, headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
      expect(error["code"]).to eq("not_found")
    end
  end

  describe "POST /api/v1/employees/:id/terminate" do
    let!(:employee) { create(:employee, hire_date: Date.new(2021, 3, 15)) }

    it "terminates today by default" do
      post "/api/v1/employees/#{employee.id}/terminate", headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("id" => employee.id, "terminated_on" => "2026-10-09")
      expect(Employee.all).not_to include(employee)
    end

    it "accepts a termination date" do
      post "/api/v1/employees/#{employee.id}/terminate", params: { terminated_on: "2026-09-01" }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["terminated_on"]).to eq("2026-09-01")
    end

    it "returns 422 validation_failed for a date before the hire date" do
      post "/api/v1/employees/#{employee.id}/terminate", params: { terminated_on: "2021-03-14" }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("validation_failed")
      expect(error["details"]["terminated_on"]).to include("can't be before the hire date")
      expect(Employee.all).to include(employee)
    end

    it "returns 422 validation_failed for a future date" do
      post "/api/v1/employees/#{employee.id}/terminate", params: { terminated_on: "2026-10-10" }, headers: headers, as: :json

      expect(error["details"]["terminated_on"]).to include("can't be in the future")
    end

    it "returns 422 validation_failed for an unparseable date" do
      post "/api/v1/employees/#{employee.id}/terminate", params: { terminated_on: "not-a-date" }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("validation_failed")
      expect(error["details"]["terminated_on"]).to be_present
    end

    it "returns 422 employee_terminated when already terminated" do
      employee.update_columns(deleted_at: Time.zone.local(2026, 9, 1))

      post "/api/v1/employees/#{employee.id}/terminate", headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("employee_terminated")
    end

    it "returns 404 for an unknown id" do
      post "/api/v1/employees/0/terminate", headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end
end
