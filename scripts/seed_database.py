import csv
import sys
import os
from datetime import datetime

# Allow running from the scripts/ directory or the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from app.models import db, Tenant, Product


def import_scraped_data_from_csv(csv_file_path):
    app = create_app()
    with app.app_context():
        db.create_all()

        try:
            with open(csv_file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)

                count = 0
                for row in reader:
                    brand_name = row.get('brand')
                    if not brand_name or brand_name.strip() == "":
                        continue

                    drink_name = row.get('item_name')
                    category_name = row.get('category')
                    scraped_at_str = row.get('scraped_at')

                    try:
                        price_val = float(row.get('price', 0))
                    except (ValueError, TypeError):
                        price_val = 0

                    try:
                        if scraped_at_str:
                            scraped_dt = datetime.strptime(scraped_at_str, '%Y-%m-%d %H:%M:%S')
                        else:
                            scraped_dt = datetime.utcnow()
                    except ValueError:
                        scraped_dt = datetime.utcnow()

                    tenant = Tenant.query.filter_by(name=brand_name).first()
                    if not tenant:
                        tenant = Tenant(
                            name=brand_name,
                            is_registered=True
                        )
                        db.session.add(tenant)
                        db.session.flush()

                    existing_product = Product.query.filter_by(
                        tenant_id=tenant.id,
                        name=drink_name
                    ).first()

                    if not existing_product:
                        new_product = Product(
                            tenant_id=tenant.id,
                            name=drink_name,
                            category=category_name,
                            price=price_val,
                            scraped_at=scraped_dt
                        )
                        db.session.add(new_product)
                        count += 1
                    else:
                        existing_product.price = price_val

                db.session.commit()
                print(f"Successfully imported {count} beverage records!")

        except Exception as e:
            db.session.rollback()
            print(f"Import failed: {e}")


if __name__ == "__main__":
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'seed', 'beverage_report.csv')
    import_scraped_data_from_csv(csv_path)
