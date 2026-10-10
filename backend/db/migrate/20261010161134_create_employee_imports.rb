class CreateEmployeeImports < ActiveRecord::Migration[8.1]
  def change
    create_table :employee_imports do |t|
      t.references :user, null: false, foreign_key: true
      t.string :status, null: false, default: "queued"
      t.string :filename
      t.text :content
      t.integer :created_count, null: false, default: 0
      t.json :row_errors, null: false, default: []
      t.string :error_message

      t.timestamps
    end
  end
end
