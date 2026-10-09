module Api
  module V1
    class MetaController < BaseController
      def show
        render json: {
          countries: Employee.options_for(:country),
          departments: Employee.options_for(:department),
          levels: Employee.options_for(:level),
          genders: Employee.options_for(:gender)
        }
      end
    end
  end
end
