module Api
  module V1
    class InsightsController < BaseController
      def countries
        render json: { data: CountryInsightsSerializer.new(SalaryInsightsByCountry.new.call).to_h }
      end
    end
  end
end
