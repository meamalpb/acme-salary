class CreateEmployees < ActiveRecord::Migration[8.1]
  def change
    create_table :employees do |t|
      t.string :employee_code, null: false
      t.string :full_name, null: false
      t.string :email, null: false
      t.string :gender, null: false
      t.string :job_title, null: false
      t.string :department, null: false
      t.string :level, null: false
      t.string :country, null: false
      t.date :hire_date, null: false
      t.integer :salary, null: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :employees, :employee_code, unique: true
    add_index :employees, :email, unique: true
    add_index :employees, :country
    add_index :employees, :deleted_at
    add_index :employees, [ :country, :salary ]
  end
end
