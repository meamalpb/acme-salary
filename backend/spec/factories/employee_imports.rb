FactoryBot.define do
  factory :employee_import do
    user
    filename { "staff.csv" }
    content do
      "full_name,email,gender,job_title,department,level,country,hire_date,salary\n" \
        "Asha Rao,asha@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,38500\n"
    end
  end
end
