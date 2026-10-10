module Api
  module V1
    class EmployeeImportsController < BaseController
      rescue_from ImportEmployeesCsv::InvalidFile do |exception|
        render_error(code: "invalid_file", message: exception.message,
                     status: :unprocessable_content, details: exception.details)
      end

      def create
        upload = params.require(:file)
        raise ImportEmployeesCsv::InvalidFile, "must be sent as a file upload" unless upload.respond_to?(:read)

        # One byte past the limit is enough to detect an oversized file without reading all of it.
        content = String.new(upload.read(ImportEmployeesCsv::MAX_BYTES + 1).to_s, encoding: Encoding::UTF_8)
        ImportEmployeesCsv.check_file!(content)

        employee_import = EmployeeImport.create!(user: current_user, filename: upload.original_filename,
                                                 content: content)
        ImportEmployeesJob.perform_later(employee_import)
        render json: EmployeeImportSerializer.new(employee_import).to_h, status: :accepted
      end

      def show
        render json: EmployeeImportSerializer.new(EmployeeImport.find(params[:id])).to_h
      end
    end
  end
end
