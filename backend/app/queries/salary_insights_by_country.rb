# Per-country headcount, median salary, total payroll and top-paid employee for active employees.
# Aggregated in SQL with window functions so no employee rows are loaded into Ruby.
#
# Median: the middle salary, or the mean of the two middle salaries for an even headcount,
# rounded to whole USD. Top-paid ties go to the lowest id.
class SalaryInsightsByCountry
  Row = Struct.new(:country, :headcount, :median_salary, :total_payroll, :top_paid, keyword_init: true)

  SQL = <<~SQL.squish.freeze
    WITH ranked AS (
      SELECT id, full_name, level, country, salary,
             ROW_NUMBER() OVER (PARTITION BY country ORDER BY salary ASC, id ASC) AS salary_rank,
             ROW_NUMBER() OVER (PARTITION BY country ORDER BY salary DESC, id ASC) AS top_rank,
             COUNT(*) OVER (PARTITION BY country) AS headcount
      FROM employees
      WHERE deleted_at IS NULL
    )
    SELECT country,
           MAX(headcount) AS headcount,
           CAST(ROUND(AVG(CASE WHEN salary_rank IN ((headcount + 1) / 2, (headcount + 2) / 2) THEN salary END)) AS INTEGER) AS median_salary,
           SUM(salary) AS total_payroll,
           MAX(CASE WHEN top_rank = 1 THEN id END) AS top_id,
           MAX(CASE WHEN top_rank = 1 THEN full_name END) AS top_full_name,
           MAX(CASE WHEN top_rank = 1 THEN level END) AS top_level,
           MAX(CASE WHEN top_rank = 1 THEN salary END) AS top_salary
    FROM ranked
    GROUP BY country
    ORDER BY country
  SQL

  def call
    Employee.connection.select_all(SQL).map do |row|
      Row.new(
        country: row["country"], headcount: row["headcount"], median_salary: row["median_salary"],
        total_payroll: row["total_payroll"],
        top_paid: { id: row["top_id"], full_name: row["top_full_name"], level: row["top_level"], salary: row["top_salary"] }
      )
    end
  end
end
