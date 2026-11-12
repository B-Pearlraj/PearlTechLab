"""Store / read service requests (table: service_requests in Neon)."""
import rag

def save_request(r: dict) -> int:
    with rag.connect() as c:
        return c.execute(
            """INSERT INTO service_requests(name,email,phone,service_category,service,requirements)
               VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
            (r["name"], r["email"], r["phone"], r["service_category"], r["service"], r["requirements"])
        ).fetchone()[0]

def mark_sent(req_id: int, owner: bool, user: bool):
    with rag.connect() as c:
        c.execute("UPDATE service_requests SET owner_mail_sent=%s, user_mail_sent=%s WHERE id=%s",
                  (owner, user, req_id))

def list_requests(limit=100):
    with rag.connect() as c:
        rows = c.execute("""SELECT id,name,email,phone,service_category,service,requirements,
                                   owner_mail_sent,user_mail_sent,created_at
                            FROM service_requests ORDER BY id DESC LIMIT %s""", (limit,)).fetchall()
    keys = ["id","name","email","phone","service_category","service","requirements",
            "owner_mail_sent","user_mail_sent","created_at"]
    out = []
    for r in rows:
        d = dict(zip(keys, r)); d["created_at"] = d["created_at"].isoformat(); out.append(d)
    return out
