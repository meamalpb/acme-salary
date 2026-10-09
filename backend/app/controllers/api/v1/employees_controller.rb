module Api
  module V1
    class EmployeesController < BaseController
      DEFAULT_PER_PAGE = 25
      MAX_PER_PAGE = 100

      before_action :set_employee, only: %i[show update terminate]
      before_action :reject_terminated, only: %i[update terminate]

      rescue_from EmployeeSearch::InvalidParam do |exception|
        render_error(code: "invalid_param", message: "Invalid search parameters",
                     status: :unprocessable_content, details: exception.details)
      end

      def index
        page, per_page = pagination_params
        return unless page

        employees = EmployeeSearch.new(search_params).call.page(page).per(per_page)
        render json: {
          data: EmployeeSerializer.new(employees).to_h,
          meta: { page: employees.current_page, per_page: employees.limit_value,
                  total_count: employees.total_count, total_pages: employees.total_pages }
        }
      end

      def export
        include_terminated = search_params[:status].in?(%w[terminated all])
        csv = ExportEmployeesCsv.call(EmployeeSearch.new(search_params).call, include_terminated: include_terminated)
        send_data csv, type: "text/csv", filename: "employees-#{Date.current.iso8601}.csv"
      end

      def show
        render json: EmployeeSerializer.new(@employee).to_h
      end

      def create
        employee = CreateEmployee.call(employee_params)
        if employee.persisted?
          render json: EmployeeSerializer.new(employee).to_h, status: :created
        else
          render_validation_failed(employee)
        end
      end

      def update
        if @employee.update(employee_params.except(:employee_code))
          render json: EmployeeSerializer.new(@employee).to_h
        else
          render_validation_failed(@employee)
        end
      end

      def terminate
        terminated_on = parse_terminated_on
        return if terminated_on == :invalid

        if TerminateEmployee.call(@employee, terminated_on: terminated_on)
          render json: EmployeeSerializer.new(@employee).to_h
        else
          render_validation_failed(@employee)
        end
      end

      private

      # with_deleted so a terminated employee can still be shown read-only.
      def set_employee
        @employee = Employee.with_deleted.find(params[:id])
      end

      def reject_terminated
        return unless @employee.deleted?

        render_error(code: "employee_terminated", message: Employee::TERMINATED_MESSAGE,
                     status: :unprocessable_content)
      end

      def employee_params
        params.require(:employee).permit(:full_name, :email, :gender, :job_title, :department,
                                         :level, :country, :hire_date, :salary)
      end

      def search_params
        params.permit(:status, :q, :country, :department, :level, :sort, :direction)
      end

      # Renders a 422 and returns nil when page or per_page is invalid.
      def pagination_params
        page = integer_param(:page, default: 1, min: 1)
        per_page = integer_param(:per_page, default: DEFAULT_PER_PAGE, min: 1, max: MAX_PER_PAGE)
        [ page, per_page ] if page && per_page
      end

      def integer_param(name, default:, min:, max: nil)
        raw = params[name]
        return default if raw.blank?

        value = Integer(raw.to_s, exception: false)
        return value if value && value >= min && (max.nil? || value <= max)

        range = max ? "between #{min} and #{max}" : "at least #{min}"
        render_error(code: "invalid_param", message: "Invalid #{name}", status: :unprocessable_content,
                     details: { name => [ "must be an integer #{range}" ] })
        nil
      end

      # nil when absent (the service defaults to today), :invalid after rendering a 422.
      def parse_terminated_on
        return nil if params[:terminated_on].blank?

        Date.iso8601(params[:terminated_on].to_s)
      rescue Date::Error
        render_error(code: "validation_failed", message: "Validation failed", status: :unprocessable_content,
                     details: { terminated_on: [ "is not a valid date" ] })
        :invalid
      end
    end
  end
end
