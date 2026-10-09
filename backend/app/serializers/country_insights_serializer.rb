class CountryInsightsSerializer
  include Alba::Resource

  attributes :country, :headcount, :median_salary, :total_payroll, :top_paid
end
