module Api
  module V1
    # Demo-only helpers: wipe all employees, or seed a fresh set.
    class DemoController < BaseController
      def seed
        if Employee.with_deleted.exists?
          return render_error(code: "employees_exist", message: "Delete all employees before seeding",
                              status: :unprocessable_content)
        end

        render json: { created_count: DemoData.seed }, status: :created
      end

      def destroy_employees
        render json: { deleted_count: DemoData.reset }
      end
    end
  end
end
