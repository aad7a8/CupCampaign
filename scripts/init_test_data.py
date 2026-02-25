import sys
import os

# Allow running from the scripts/ directory or the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from app.models import db, Tenant, Store


def init_test_data():
    app = create_app()
    with app.app_context():
        db.create_all()

        test_tenant = Tenant.query.filter_by(name="測試品牌").first()

        if not test_tenant:
            test_tenant = Tenant(
                name="測試品牌",
                is_registered=True
            )
            db.session.add(test_tenant)
            db.session.commit()
            print(f"Test tenant created! ID: {test_tenant.id}")
        else:
            print(f"Test tenant already exists. ID: {test_tenant.id}")

        test_store = Store.query.filter_by(name="測試總店").first()

        if not test_store:
            new_store = Store(
                tenant_id=test_tenant.id,
                name="測試總店",
                location_city="台北市"
            )
            db.session.add(new_store)
            db.session.commit()
            print(f"Test store created! ID: {new_store.id}")
        else:
            print(f"Test store already exists. ID: {test_store.id}")


if __name__ == "__main__":
    init_test_data()
