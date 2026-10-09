require "rails_helper"

RSpec.describe EmployeeSearch do
  def search(params = {})
    described_class.new(params).call
  end

  def names(params = {})
    search(params).map(&:full_name)
  end

  def terminate(employee, on: Time.zone.local(2026, 9, 1))
    employee.update_columns(deleted_at: on)
    employee
  end

  describe "status" do
    let!(:active) { create(:employee, full_name: "Active") }
    let!(:gone) { terminate(create(:employee, full_name: "Gone")) }

    it "defaults to active employees" do
      expect(search).to contain_exactly(active)
    end

    it "returns active employees for status=active" do
      expect(search(status: "active")).to contain_exactly(active)
    end

    it "returns only terminated employees for status=terminated" do
      expect(search(status: "terminated")).to contain_exactly(gone)
    end

    it "returns active and terminated employees for status=all" do
      expect(search(status: "all")).to contain_exactly(active, gone)
    end

    it "applies q and filters to both when status=all" do
      other = terminate(create(:employee, full_name: "Gone Too", country: "germany"))

      expect(search(status: "all", q: "gone")).to contain_exactly(gone, other)
      expect(search(status: "all", q: "gone", country: "germany")).to contain_exactly(other)
    end

    it "allows sorting by terminated_on when status=all, with active employees first" do
      later = terminate(create(:employee, full_name: "Later"), on: Time.zone.local(2026, 9, 20))

      expect(search(status: "all", sort: "terminated_on").to_a).to eq([ active, gone, later ])
    end

    it "rejects an unknown status" do
      expect { search(status: "retired") }.to raise_error(described_class::InvalidParam) { |e|
        expect(e.details).to include("status" => be_present)
      }
    end
  end

  describe "q" do
    let!(:priya) { create(:employee, full_name: "Priya Sharma", email: "priya.s@acme.test", employee_code: "EMP-00042") }
    let!(:john) { create(:employee, full_name: "John Smith", email: "jsmith@acme.test", employee_code: "EMP-00100") }

    it "matches part of the name" do
      expect(search(q: "riya")).to contain_exactly(priya)
    end

    it "matches part of the email" do
      expect(search(q: "jsmith@")).to contain_exactly(john)
    end

    it "matches part of the employee code" do
      expect(search(q: "00042")).to contain_exactly(priya)
    end

    it "is case-insensitive" do
      expect(search(q: "PRIYA SHARMA")).to contain_exactly(priya)
      expect(search(q: "emp-00100")).to contain_exactly(john)
    end

    it "ignores surrounding whitespace" do
      expect(search(q: "  priya ")).to contain_exactly(priya)
    end

    it "matches across all three columns with OR" do
      expect(search(q: "s")).to contain_exactly(priya, john)
    end

    it "returns everything when blank" do
      expect(search(q: "")).to contain_exactly(priya, john)
    end

    it "treats % and _ literally, not as wildcards" do
      create(:employee, full_name: "Fifty 50% Off")
      create(:employee, full_name: "Under_score")

      expect(names(q: "50%")).to eq([ "Fifty 50% Off" ])
      expect(names(q: "r_s")).to eq([ "Under_score" ])
      expect(names(q: "%")).to eq([ "Fifty 50% Off" ])
    end

    it "treats a backslash literally" do
      create(:employee, full_name: "Back\\slash")

      expect(names(q: "\\")).to eq([ "Back\\slash" ])
    end

    it "searches within the chosen status only" do
      terminate(create(:employee, full_name: "Priya Gone"))

      expect(names(q: "priya")).to eq([ "Priya Sharma" ])
      expect(names(q: "priya", status: "terminated")).to eq([ "Priya Gone" ])
    end
  end

  describe "filters" do
    let!(:india_eng_senior) { create(:employee, country: "india", department: "engineering", level: "senior") }
    let!(:india_sales_junior) { create(:employee, country: "india", department: "sales", level: "junior") }
    let!(:us_eng_senior) { create(:employee, country: "united_states", department: "engineering", level: "senior") }

    it "filters by country" do
      expect(search(country: "india")).to contain_exactly(india_eng_senior, india_sales_junior)
    end

    it "filters by department" do
      expect(search(department: "engineering")).to contain_exactly(india_eng_senior, us_eng_senior)
    end

    it "filters by level" do
      expect(search(level: "junior")).to contain_exactly(india_sales_junior)
    end

    it "combines filters with AND" do
      expect(search(country: "india", department: "engineering", level: "senior")).to contain_exactly(india_eng_senior)
      expect(search(country: "united_states", level: "junior")).to be_empty
    end

    it "combines filters with q" do
      india_eng_senior.update!(full_name: "Priya Sharma")
      us_eng_senior.update!(full_name: "Priya Jones")

      expect(search(q: "priya", country: "india")).to contain_exactly(india_eng_senior)
    end

    it "ignores blank filter values" do
      expect(search(country: "", department: "", level: "").count).to eq(3)
    end

    it "accepts string keys, as params arrive from the controller" do
      expect(search("country" => "india", "level" => "junior")).to contain_exactly(india_sales_junior)
    end

    %w[country department level].each do |filter|
      it "rejects an unknown #{filter}" do
        expect { search(filter => "atlantis") }.to raise_error(described_class::InvalidParam) { |e|
          expect(e.details).to include(filter => be_present)
        }
      end
    end
  end

  describe "sort" do
    let!(:amy) { create(:employee, full_name: "Amy", salary: 50_000, hire_date: Date.new(2022, 1, 1)) }
    let!(:bob) { create(:employee, full_name: "Bob", salary: 30_000, hire_date: Date.new(2020, 1, 1)) }
    let!(:cat) { create(:employee, full_name: "Cat", salary: 40_000, hire_date: Date.new(2021, 1, 1)) }

    it "defaults to full_name ascending" do
      expect(names).to eq(%w[Amy Bob Cat])
    end

    it "sorts by salary" do
      expect(names(sort: "salary")).to eq(%w[Bob Cat Amy])
      expect(names(sort: "salary", direction: "desc")).to eq(%w[Amy Cat Bob])
    end

    it "sorts by hire_date" do
      expect(names(sort: "hire_date")).to eq(%w[Bob Cat Amy])
      expect(names(sort: "hire_date", direction: "desc")).to eq(%w[Amy Cat Bob])
    end

    it "sorts by full_name descending" do
      expect(names(sort: "full_name", direction: "desc")).to eq(%w[Cat Bob Amy])
    end

    it "breaks ties by id so pages are stable" do
      a = create(:employee, full_name: "Tie", salary: 99_000)
      b = create(:employee, full_name: "Tie", salary: 99_000)
      c = create(:employee, full_name: "Tie", salary: 99_000)

      expect(search(sort: "salary", direction: "desc").first(3).map(&:id)).to eq([ a.id, b.id, c.id ])
    end

    it "sorts terminated employees by terminated_on" do
      late = terminate(create(:employee, full_name: "Late"), on: Time.zone.local(2026, 9, 20))
      early = terminate(create(:employee, full_name: "Early"), on: Time.zone.local(2026, 8, 1))

      expect(search(status: "terminated", sort: "terminated_on").to_a).to eq([ early, late ])
      expect(search(status: "terminated", sort: "terminated_on", direction: "desc").to_a).to eq([ late, early ])
    end

    it "rejects terminated_on for active employees" do
      expect { search(sort: "terminated_on") }.to raise_error(described_class::InvalidParam) { |e|
        expect(e.details).to include("sort" => be_present)
      }
    end

    it "rejects an unknown sort field" do
      expect { search(sort: "email") }.to raise_error(described_class::InvalidParam) { |e|
        expect(e.details).to include("sort" => be_present)
      }
    end

    it "rejects an unknown direction" do
      expect { search(direction: "sideways") }.to raise_error(described_class::InvalidParam) { |e|
        expect(e.details).to include("direction" => be_present)
      }
    end
  end

  it "reports every invalid param at once" do
    expect { search(country: "atlantis", sort: "email", status: "retired") }
      .to raise_error(described_class::InvalidParam) { |e|
        expect(e.details.keys).to contain_exactly("country", "sort", "status")
      }
  end
end
