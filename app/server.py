"""GymFlow: Python 3.12 + SQLite, no third-party runtime dependencies."""
import argparse, datetime as dt, hashlib, hmac, json, mimetypes, os, re, secrets, sqlite3, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT=Path(__file__).parent
DB_PATH=Path(os.environ.get('GYMFLOW_DB',str(ROOT.parent/'work/gymflow.sqlite3')))
try: TZ=ZoneInfo('America/Sao_Paulo')
except ZoneInfoNotFoundError: TZ=dt.timezone(dt.timedelta(hours=-3))
ATTEMPTS={}
def now(): return dt.datetime.now(TZ)
def today(): return now().date().isoformat()
def stamp(): return now().isoformat(timespec='seconds')
def connect():
    db=sqlite3.connect(DB_PATH,timeout=20)
    db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db
def rows(db,sql,args=()): return [dict(x) for x in db.execute(sql,args).fetchall()]
def one(db,sql,args=()):
    row=db.execute(sql,args).fetchone()
    return dict(row) if row else None
def password_hash(value):
    salt=secrets.token_hex(16)
    return salt+':'+hashlib.scrypt(value.encode(),salt=salt.encode(),n=16384,r=8,p=1).hex()
def password_ok(value,stored):
    salt,digest=stored.split(':')
    return hmac.compare_digest(hashlib.scrypt(value.encode(),salt=salt.encode(),n=16384,r=8,p=1).hex(),digest)
def init_db(seed=False):
    DB_PATH.parent.mkdir(parents=True,exist_ok=True)
    with connect() as db:
        db.executescript((ROOT/'schema.sql').read_text())
        if seed and not db.execute('SELECT 1 FROM users LIMIT 1').fetchone(): seed_db(db)
    os.chmod(DB_PATH,0o600)
def seed_db(db):
    created=stamp(); pwd=password_hash('GymFlow@2026!')
    names=['Administrador Demo','Rafael Costa','Camila Duarte','Lucas Mendes','Mariana Alves','Pedro Santos','Julia Ribeiro','Gabriel Lima','Beatriz Oliveira','Felipe Rocha','Isabela Martins','Bruno Ferreira','Larissa Gomes','Thiago Barbosa','Ana Cardoso','Matheus Nunes','Carolina Dias','André Teixeira','Sofia Azevedo']
    for i,name in enumerate(names,1):
        role='admin' if i==1 else 'teacher' if i<5 else 'student'
        email='admin@gymflow.demo' if i==1 else f'professor{i-1}@gymflow.demo' if i<5 else f'aluno{i-4}@gymflow.demo'
        db.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)',(i,name,email,pwd,role,'(11) 90000-0000',int(i!=19),created))
        if role=='teacher': db.execute('INSERT INTO teachers VALUES(?,?,?)',(i,['Musculação e força','Condicionamento funcional','Mobilidade e performance'][i-2],f'DEMO-{i:04}'))
    for i,p in enumerate([('Essencial','Sua rotina, no seu ritmo',119.9,1,'Musculação • Acesso livre'),('Performance','Mais possibilidades para evoluir',179.9,1,'Musculação • Aulas coletivas • Avaliação'),('Black','Uma experiência completa',239.9,1,'Todas as modalidades • Acompanhamento individual')],1): db.execute('INSERT INTO membership_plans VALUES(?,?,?,?,?,?,1)',(i,*p))
    for i in range(5,20):
        enrollment=(now().date()-dt.timedelta(days=200-i*8)).isoformat()
        db.execute('INSERT INTO students VALUES(?,?,?,?,?,?)',(i,2+(i%3),'1995-05-12',enrollment,'Condicionamento e força',1))
        sid=db.execute('INSERT INTO subscriptions(student_id,plan_id,start) VALUES(?,?,?)',(i,1+i%3,enrollment)).lastrowid
        for month in range(6):
            date=(now().date().replace(day=1)-dt.timedelta(days=30*month)).replace(day=10)
            paid=month>0 or i%4!=0
            db.execute('INSERT INTO payments(student_id,subscription_id,amount,due,status,paid_at,method) VALUES(?,?,?,?,?,?,?)',(i,sid,[119.9,179.9,239.9][i%3],date.isoformat(),'Pago' if paid else 'Pendente',date.isoformat()+'T10:00:00-03:00' if paid else None,'Registro demonstrativo' if paid else ''))
        for days in range(28):
            if (days+i)%4!=0:
                day=(now().date()-dt.timedelta(days=days)).isoformat()
                db.execute('INSERT INTO attendance(student_id,day,time,actor_id) VALUES(?,?,?,1)',(i,day,f'{6+i%13:02}:30'))
        for days,weight in [(60,74+i/2),(30,73+i/2),(0,72+i/2)]:
            date=(now().date()-dt.timedelta(days=days)).isoformat()
            db.execute('INSERT INTO assessments(student_id,teacher_id,date,weight,height,waist,notes,objective,next_date) VALUES(?,?,?,?,?,?,?,?,?)',(i,2+i%3,date,weight,170,80,'Registro fictício para demonstração.','Acompanhar medidas definidas com o aluno',(now().date()+dt.timedelta(days=30-days)).isoformat()))
    exercise_names=['Supino reto','Agachamento livre','Puxada frontal','Remada baixa','Leg press 45°','Desenvolvimento com halteres','Rosca direta','Tríceps na polia','Prancha','Elevação lateral','Cadeira extensora','Mesa flexora','Stiff','Elevação pélvica','Panturrilha em pé','Supino inclinado','Crucifixo','Remada unilateral','Pulldown','Rosca martelo','Tríceps francês','Abdominal no solo','Afundo','Agachamento goblet','Flexão de braços','Bicicleta ergométrica','Esteira','Mobilidade de quadril','Face pull','Elevação de joelhos']
    muscles=['Peitoral','Pernas','Costas','Costas','Pernas','Ombros','Bíceps','Tríceps','Core','Ombros','Pernas','Pernas','Posteriores','Glúteos','Panturrilhas']
    for i,name in enumerate(exercise_names,1): db.execute('INSERT INTO exercises(name,muscle,equipment,level,instructions,precautions) VALUES(?,?,?,?,?,?)',(name,muscles[(i-1)%15],['Halteres','Barra','Máquina','Peso corporal'][i%4],['Iniciante','Intermediário'][i%2],'Ajuste a posição inicial. Execute o movimento de forma controlada, mantendo a postura indicada pelo professor.','Peça orientação profissional para ajustar a execução e interrompa em caso de dor.'))
    for i in range(10):
        student=5+i
        wid=db.execute('INSERT INTO workouts(student_id,teacher_id,name,objective,division,notes,created,updated) VALUES(?,?,?,?,?,?,?,?)',(student,2+student%3,['Força e condicionamento','Membros inferiores','Superiores e core'][i%3],'Condicionamento e força','ABC'[i%3],'Respeite o intervalo e registre as cargas utilizadas.',created,created)).lastrowid
        for pos,eid in enumerate([1+i%4,5+i%5,9,10+i%5]): db.execute('INSERT INTO workout_exercises(workout_id,exercise_id,position,sets,reps,load,rest) VALUES(?,?,?,?,?,?,?)',(wid,eid,pos,3,'12',20,60))
    db.execute('INSERT INTO notifications(user_id,title,created) VALUES(1,?,?)',('Bem-vindo ao GymFlow. Esta base contém apenas dados demonstrativos.',created))

class APIError(Exception):
    def __init__(self,status,message): self.status,self.message=status,message

def fail(status,message): raise APIError(status,message)
def text_field(data,key,minlen=1,maxlen=5000):
    v=data.get(key,'')
    if not isinstance(v,str) or not minlen<=len(v.strip())<=maxlen: fail(400,f'Confira o campo {key}.')
    return v.strip()
def number(data,key,minimum=0,maximum=100000,integer=False):
    try:
        raw=data[key]; v=float(raw)
        if not minimum<=v<=maximum or (integer and v!=int(v)): raise ValueError()
        return int(v) if integer else v
    except (ValueError,TypeError,KeyError,OverflowError): fail(400,f'Valor inválido: {key}.')
def date_field(data,key):
    value=text_field(data,key)
    try: dt.date.fromisoformat(value)
    except ValueError: fail(400,f'Data inválida: {key}.')
    return value

def allowed_student(db,user,sid):
    s=one(db,'SELECT s.*,u.active FROM students s JOIN users u ON u.id=s.user_id WHERE user_id=?',(sid,))
    if not s: fail(404,'Aluno não encontrado.')
    if user['role']=='student' and sid!=user['id']: fail(403,'Você não tem acesso a este aluno.')
    if user['role']=='teacher' and s['teacher_id']!=user['id']: fail(403,'Este aluno não está sob sua responsabilidade.')
    return s

def require_role(user,*roles):
    if user['role'] not in roles: fail(403,'Seu perfil não permite esta operação.')

def audit(db,user,action,entity,eid=None): db.execute('INSERT INTO audit_logs(actor_id,action,entity,entity_id,created) VALUES(?,?,?,?,?)',(user['id'],action,entity,eid,stamp()))

def dataset(db,user):
    role=user['role']; args=(); scope=''
    if role=='student': scope=' WHERE s.user_id=?'; args=(user['id'],)
    elif role=='teacher': scope=' WHERE s.teacher_id=?'; args=(user['id'],)
    students=rows(db,"""SELECT u.id,u.name,u.email,u.phone,u.active,s.birthday,s.enrollment,s.objective,s.consent,s.teacher_id,t.name teacher,p.name plan,p.id plan_id FROM students s JOIN users u ON u.id=s.user_id LEFT JOIN users t ON t.id=s.teacher_id LEFT JOIN subscriptions sub ON sub.student_id=s.user_id AND sub.active=1 LEFT JOIN membership_plans p ON p.id=sub.plan_id"""+scope,args)
    ids=[s['id'] for s in students]; marks=','.join('?' for _ in ids) or 'NULL'
    def scoped(table,order='id DESC'): return rows(db,f'SELECT * FROM {table} WHERE student_id IN ({marks}) ORDER BY {order}',ids)
    workouts=scoped('workouts')
    for w in workouts:
        w['exercises']=rows(db,'SELECT we.*,e.name,e.muscle,e.instructions,e.precautions FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE workout_id=? ORDER BY position',(w['id'],))
        w['versions']=rows(db,'SELECT id,created,snapshot FROM workout_versions WHERE workout_id=? ORDER BY id DESC',(w['id'],))
    sessions=scoped('workout_sessions')
    for s in sessions: s['logs']=rows(db,'SELECT * FROM workout_logs WHERE session_id=?',(s['id'],))
    payments=scoped('payments') if role!='teacher' else []
    for p in payments:
        if p['status']=='Pendente' and p['due']<today(): p['status']='Vencido'
    teachers=rows(db,'SELECT u.id,u.name,u.email,u.phone,u.active,t.specialty,t.registration FROM teachers t JOIN users u ON u.id=t.user_id'+(' WHERE u.id=?' if role=='teacher' else ''),(user['id'],) if role=='teacher' else ()) if role!='student' else []
    return dict(user=user,students=students,teachers=teachers,exercises=rows(db,'SELECT * FROM exercises ORDER BY name'),workouts=workouts,assessments=scoped('assessments','date DESC,id DESC'),attendance=scoped('attendance','day DESC,time DESC'),payments=payments,plans=rows(db,'SELECT * FROM membership_plans'),subscriptions=scoped('subscriptions'),sessions=sessions,settings=one(db,'SELECT * FROM settings WHERE id=1'),notifications=rows(db,'SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC',(user['id'],)),audit=rows(db,'SELECT a.*,u.name actor FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100') if role=='admin' else [],today=today(),demo=bool(os.environ.get('GYMFLOW_DEMO','1')=='1'),integrations={'ai':False,'email':False,'gateway':False})

class Handler(BaseHTTPRequestHandler):
    server_version='GymFlow'
    def log_message(self,fmt,*args): pass
    def send(self,status,data,cookie=None):
        body=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.security()
        if cookie: self.send_header('Set-Cookie',cookie)
        self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def security(self):
        self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','same-origin'); self.send_header('X-Frame-Options','DENY')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
    def do_GET(self): self.handle_request('GET')
    def do_POST(self): self.handle_request('POST')
    def do_PUT(self): self.handle_request('PUT')
    def do_DELETE(self): self.handle_request('DELETE')
    def handle_request(self,method):
        try:
            path=urlparse(self.path).path
            if not path.startswith('/api/'):
                if method!='GET': fail(405,'Método não permitido.')
                name=path.lstrip('/') if path in ['/app.js','/style.css'] or path.startswith('/fonts/') else 'index.html'
                file=(ROOT/'static'/name).resolve()
                if not file.is_relative_to((ROOT/'static').resolve()) or not file.is_file(): fail(404,'Arquivo não encontrado.')
                body=file.read_bytes(); self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream'); self.security(); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
            data={}
            if method!='GET':
                origin=self.headers.get('Origin')
                if origin and urlparse(origin).netloc!=self.headers.get('Host'): fail(403,'Origem não permitida.')
                if self.headers.get('Content-Type','').split(';')[0]!='application/json': fail(415,'Envie dados JSON.')
                length=int(self.headers.get('Content-Length','0'))
                if length<0 or length>200000: fail(413,'Requisição muito grande.')
                try: data=json.loads(self.rfile.read(length) or b'{}')
                except ValueError: fail(400,'JSON inválido.')
                if not isinstance(data,dict): fail(400,'Dados inválidos.')
            with connect() as db:
                if path=='/api/health' and method=='GET':
                    if not one(db,'SELECT id FROM settings WHERE id=1'): fail(503,'Banco indisponível.')
                    self.send(200,{'status':'ok'}); return
                if path=='/api/config' and method=='GET':
                    self.send(200,{'demo':os.environ.get('GYMFLOW_DEMO','1')=='1'}); return
                if path=='/api/login' and method=='POST':
                    key=self.client_address[0]; recent=[x for x in ATTEMPTS.get(key,[]) if x>time.time()-60]; ATTEMPTS[key]=recent
                    if len(recent)>=12: fail(429,'Muitas tentativas. Aguarde um minuto.')
                    recent.append(time.time())
                    email=text_field(data,'email',3,200); pwd=text_field(data,'password',1,200)
                    user=one(db,'SELECT * FROM users WHERE email=? AND active=1',(email,))
                    if not user or not password_ok(pwd,user['password']): fail(401,'E-mail ou senha incorretos.')
                    token=secrets.token_urlsafe(32); csrf=secrets.token_urlsafe(32)
                    db.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
                    db.execute('INSERT INTO sessions VALUES(?,?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),user['id'],csrf,time.time()+8*3600))
                    secure='; Secure' if os.environ.get('GYMFLOW_SECURE_COOKIE')=='1' else ''
                    db.commit(); self.send(200,{'ok':True},f'gymflow_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800{secure}'); return
                cookie=dict(part.strip().split('=',1) for part in self.headers.get('Cookie','').split(';') if '=' in part)
                token=hashlib.sha256(cookie.get('gymflow_session','').encode()).hexdigest()
                session=one(db,'SELECT * FROM sessions WHERE token=? AND expires>?',(token,time.time()))
                if not session: fail(401,'Entre na sua conta para continuar.')
                user=one(db,'SELECT id,name,email,role,phone,active FROM users WHERE id=? AND active=1',(session['user_id'],))
                if not user: fail(401,'Conta desativada.')
                if method!='GET' and not hmac.compare_digest(self.headers.get('X-CSRF-Token',''),session['csrf']): fail(403,'Sessão inválida. Atualize a página.')
                if path=='/api/state' and method=='GET':
                    result=dataset(db,user); result['csrf']=session['csrf']; self.send(200,result); return
                if path=='/api/logout' and method=='POST':
                    db.execute('DELETE FROM sessions WHERE token=?',(token,)); db.commit(); self.send(200,{'ok':True},'gymflow_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return
                if path=='/api/profile' and method=='PUT':
                    name=text_field(data,'name',2,100); phone=text_field(data,'phone',0,40)
                    db.execute('UPDATE users SET name=?,phone=? WHERE id=?',(name,phone,user['id']))
                    if data.get('new_password'):
                        old=text_field(data,'current_password',1,200); new=text_field(data,'new_password',12,200)
                        stored=one(db,'SELECT password FROM users WHERE id=?',(user['id'],))['password']
                        if not password_ok(old,stored): fail(400,'A senha atual está incorreta.')
                        db.execute('UPDATE users SET password=? WHERE id=?',(password_hash(new),user['id']))
                        db.execute('DELETE FROM sessions WHERE user_id=? AND token<>?',(user['id'],token))
                    audit(db,user,'Atualizou perfil','users',user['id']); db.commit(); self.send(200,{'ok':True}); return
                result=self.mutate(db,user,method,path,data)
                db.commit()
                self.send(200,result or {'ok':True})
        except APIError as e: self.send(e.status,{'error':e.message})
        except sqlite3.IntegrityError: self.send(409,{'error':'Registro duplicado ou vínculo inválido. Confira os dados.'})
        except (ValueError,TypeError,KeyError): self.send(400,{'error':'Dados incompletos ou inválidos.'})
        except Exception:
            import traceback; traceback.print_exc()
            self.send(500,{'error':'Não foi possível concluir. Tente novamente.'})
    def mutate(self,db,u,method,path,d):
        parts=path.strip('/').split('/'); entity=parts[1] if len(parts)>1 else ''; eid=int(parts[2]) if len(parts)>2 and parts[2].isdigit() else None
        if entity in ['students','teachers']:
            require_role(u,'admin'); role='student' if entity=='students' else 'teacher'
            if method not in ['POST','PUT','DELETE']: fail(405,'Método não permitido.')
            if eid:
                target=one(db,'SELECT * FROM users WHERE id=? AND role=?',(eid,role))
                if not target: fail(404,'Cadastro não encontrado.')
            if method=='DELETE':
                db.execute('UPDATE users SET active=0 WHERE id=?',(eid,)); db.execute('DELETE FROM sessions WHERE user_id=?',(eid,)); audit(db,u,'Desativou cadastro',entity,eid); return
            name=text_field(d,'name',2,100); email=text_field(d,'email',3,200).lower(); phone=text_field(d,'phone',0,40)
            if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): fail(400,'Informe um e-mail válido.')
            if method=='POST':
                pwd=text_field(d,'password',12,200)
                eid=db.execute('INSERT INTO users(name,email,password,role,phone,created) VALUES(?,?,?,?,?,?)',(name,email,password_hash(pwd),role,phone,stamp())).lastrowid
                if role=='student': db.execute('INSERT INTO students(user_id,enrollment) VALUES(?,?)',(eid,today()))
                else: db.execute('INSERT INTO teachers VALUES(?,?,?)',(eid,'',''))
            else:
                active=number(d,'active',0,1,True)
                db.execute('UPDATE users SET name=?,email=?,phone=?,active=? WHERE id=?',(name,email,phone,active,eid))
                if not active: db.execute('DELETE FROM sessions WHERE user_id=?',(eid,))
            if role=='student':
                teacher_id=number(d,'teacher_id',1,100000,True)
                if not one(db,'SELECT u.id FROM teachers t JOIN users u ON u.id=t.user_id WHERE t.user_id=? AND u.active=1',(teacher_id,)): fail(400,'Selecione um professor ativo.')
                birthday=date_field(d,'birthday') if d.get('birthday') else None
                if birthday and birthday>today(): fail(400,'Nascimento não pode ser no futuro.')
                consent=number(d,'consent',0,1,True)
                db.execute('UPDATE students SET teacher_id=?,birthday=?,objective=?,consent=? WHERE user_id=?',(teacher_id,birthday,text_field(d,'objective',0,1000),consent,eid))
            else: db.execute('UPDATE teachers SET specialty=?,registration=? WHERE user_id=?',(text_field(d,'specialty',2,200),text_field(d,'registration',0,80),eid))
            audit(db,u,'Salvou cadastro',entity,eid); return {'ok':True,'id':eid}
        if entity=='plans':
            require_role(u,'admin')
            if method=='DELETE':
                if not one(db,'SELECT id FROM membership_plans WHERE id=?',(eid,)): fail(404,'Plano não encontrado.')
                db.execute('UPDATE membership_plans SET active=0 WHERE id=?',(eid,))
            elif method in ['POST','PUT']:
                values=(text_field(d,'name',2,80),text_field(d,'description',1,1000),number(d,'price',0,100000),number(d,'months',1,36,True),text_field(d,'benefits',1,2000))
                if method=='POST': eid=db.execute('INSERT INTO membership_plans(name,description,price,months,benefits) VALUES(?,?,?,?,?)',values).lastrowid
                else:
                    if not one(db,'SELECT id FROM membership_plans WHERE id=?',(eid,)): fail(404,'Plano não encontrado.')
                    db.execute('UPDATE membership_plans SET name=?,description=?,price=?,months=?,benefits=?,active=? WHERE id=?',(*values,number(d,'active',0,1,True),eid))
            else: fail(405,'Método não permitido.')
            audit(db,u,'Salvou plano','plans',eid); return
        if entity=='subscriptions' and method=='POST':
            require_role(u,'admin'); sid=number(d,'student_id',1,100000,True); s=allowed_student(db,u,sid)
            if not s['active']: fail(400,'Aluno inativo.')
            pid=number(d,'plan_id',1,100000,True); p=one(db,'SELECT * FROM membership_plans WHERE id=? AND active=1',(pid,))
            if not p: fail(400,'Selecione um plano ativo.')
            due=date_field(d,'due')
            db.execute('UPDATE subscriptions SET active=0 WHERE student_id=?',(sid,))
            eid=db.execute('INSERT INTO subscriptions(student_id,plan_id,start) VALUES(?,?,?)',(sid,pid,today())).lastrowid
            db.execute('INSERT INTO payments(student_id,subscription_id,amount,due,status) VALUES(?,?,?,?,?)',(sid,eid,p['price'],due,'Pendente'))
            audit(db,u,'Vinculou plano e gerou cobrança','subscriptions',eid); return
        if entity=='payments':
            require_role(u,'admin')
            if method=='POST':
                sid=number(d,'student_id',1,100000,True); allowed_student(db,u,sid)
                sub=one(db,'SELECT sub.*,p.price FROM subscriptions sub JOIN membership_plans p ON p.id=sub.plan_id WHERE student_id=? AND sub.active=1',(sid,))
                if not sub: fail(400,'Vincule um plano antes de gerar uma cobrança.')
                due=date_field(d,'due')
                if one(db,"SELECT id FROM payments WHERE subscription_id=? AND due=? AND status<>'Cancelado'",(sub['id'],due)): fail(409,'Já existe uma cobrança para este vencimento.')
                eid=db.execute("INSERT INTO payments(student_id,subscription_id,amount,due,status) VALUES(?,?,?,?,'Pendente')",(sid,sub['id'],sub['price'],due)).lastrowid
            elif method=='PUT':
                payment=one(db,'SELECT * FROM payments WHERE id=?',(eid,))
                if not payment: fail(404,'Cobrança não encontrada.')
                if payment['status']!='Pendente': fail(409,'A cobrança já foi paga ou cancelada.')
                status=text_field(d,'status')
                if status not in ['Pago','Cancelado']: fail(400,'Status inválido.')
                payment_method=text_field(d,'method',1,80) if status=='Pago' else ''
                db.execute('UPDATE payments SET status=?,paid_at=?,method=? WHERE id=?',(status,stamp() if status=='Pago' else None,payment_method,eid))
            else: fail(405,'Método não permitido.')
            audit(db,u,'Atualizou cobrança (registro manual)','payments',eid); return
        if entity=='exercises':
            require_role(u,'admin','teacher')
            if method=='DELETE':
                if not one(db,'SELECT id FROM exercises WHERE id=?',(eid,)): fail(404,'Exercício não encontrado.')
                db.execute('UPDATE exercises SET active=0 WHERE id=?',(eid,))
            elif method in ['POST','PUT']:
                values=tuple(text_field(d,k,1,2000) for k in ['name','muscle','equipment','level','instructions'])+(text_field(d,'precautions',0,2000),)
                if method=='POST': eid=db.execute('INSERT INTO exercises(name,muscle,equipment,level,instructions,precautions) VALUES(?,?,?,?,?,?)',values).lastrowid
                else:
                    if not one(db,'SELECT id FROM exercises WHERE id=?',(eid,)): fail(404,'Exercício não encontrado.')
                    db.execute('UPDATE exercises SET name=?,muscle=?,equipment=?,level=?,instructions=?,precautions=?,active=? WHERE id=?',(*values,number(d,'active',0,1,True),eid))
            else: fail(405,'Método não permitido.')
            audit(db,u,'Salvou exercício','exercises',eid); return
        if entity=='attendance' and method=='POST':
            require_role(u,'admin','teacher','student'); sid=number(d,'student_id',1,100000,True); s=allowed_student(db,u,sid)
            if not s['active']: fail(400,'Aluno inativo.')
            if one(db,'SELECT id FROM attendance WHERE student_id=? AND day=?',(sid,today())): fail(409,'O check-in de hoje já foi registrado.')
            eid=db.execute('INSERT INTO attendance(student_id,day,time,actor_id) VALUES(?,?,?,?)',(sid,today(),now().strftime('%H:%M'),u['id'])).lastrowid
            audit(db,u,'Registrou check-in','attendance',eid); return
        if entity=='workouts':
            require_role(u,'admin','teacher')
            if method not in ['POST','PUT','DELETE']: fail(405,'Método não permitido.')
            old=None
            if eid:
                old=one(db,'SELECT * FROM workouts WHERE id=?',(eid,))
                if not old: fail(404,'Treino não encontrado.')
                allowed_student(db,u,old['student_id'])
            if method=='DELETE': db.execute('UPDATE workouts SET active=0 WHERE id=?',(eid,)); audit(db,u,'Desativou treino','workouts',eid); return
            sid=number(d,'student_id',1,100000,True); s=allowed_student(db,u,sid)
            if not s['active']: fail(400,'Aluno inativo.')
            if old and sid!=old['student_id']: fail(400,'O aluno de uma ficha existente não pode ser alterado.')
            division=text_field(d,'division',1,1).upper()
            if division not in 'ABCDEFG': fail(400,'Divisão inválida.')
            values=(sid,u['id'],text_field(d,'name',2,100),text_field(d,'objective',2,1000),division,text_field(d,'notes',0,3000))
            ex=d.get('exercises')
            if not isinstance(ex,list) or not 1<=len(ex)<=40: fail(400,'Adicione entre 1 e 40 exercícios.')
            configured=[]
            for pos,e in enumerate(ex):
                exid=number(e,'exercise_id',1,100000,True)
                if not one(db,'SELECT id FROM exercises WHERE id=? AND active=1',(exid,)): fail(400,'Exercício indisponível.')
                configured.append((exid,pos,number(e,'sets',1,20,True),text_field(e,'reps',1,30),number(e,'load',0,1000),number(e,'rest',0,1800,True)))
            if method=='POST': eid=db.execute('INSERT INTO workouts(student_id,teacher_id,name,objective,division,notes,created,updated) VALUES(?,?,?,?,?,?,?,?)',(*values,stamp(),stamp())).lastrowid
            else:
                old['exercises']=rows(db,'SELECT we.*,e.name FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE workout_id=?',(eid,))
                db.execute('INSERT INTO workout_versions(workout_id,snapshot,created) VALUES(?,?,?)',(eid,json.dumps(old),stamp()))
                db.execute('UPDATE workouts SET student_id=?,teacher_id=?,name=?,objective=?,division=?,notes=?,updated=?,active=? WHERE id=?',(*values,stamp(),number(d,'active',0,1,True),eid))
                db.execute('DELETE FROM workout_exercises WHERE workout_id=?',(eid,))
            for e in configured: db.execute('INSERT INTO workout_exercises(workout_id,exercise_id,position,sets,reps,load,rest) VALUES(?,?,?,?,?,?,?)',(eid,*e))
            audit(db,u,'Salvou ficha','workouts',eid); return
        if entity=='assessments':
            require_role(u,'admin','teacher')
            old=one(db,'SELECT * FROM assessments WHERE id=?',(eid,)) if eid else None
            if eid and not old: fail(404,'Avaliação não encontrada.')
            if old: allowed_student(db,u,old['student_id'])
            if method=='DELETE': fail(405,'Avaliações históricas são preservadas. Registre uma nova avaliação com a correção.')
            if method not in ['POST','PUT']: fail(405,'Método não permitido.')
            sid=number(d,'student_id',1,100000,True); s=allowed_student(db,u,sid)
            if old and sid!=old['student_id']: fail(400,'Aluno não pode ser alterado.')
            if not s['consent']: fail(400,'Registre a autorização para dados de avaliação no cadastro do aluno.')
            date=date_field(d,'date'); next_date=date_field(d,'next_date')
            if date>today() or next_date<date: fail(400,'Confira a data da avaliação e da reavaliação.')
            values=(sid,u['id'],date,number(d,'weight',10,500),number(d,'height',50,250),number(d,'waist',20,300),text_field(d,'notes',1,5000),text_field(d,'objective',1,2000),next_date)
            if method=='POST': eid=db.execute('INSERT INTO assessments(student_id,teacher_id,date,weight,height,waist,notes,objective,next_date) VALUES(?,?,?,?,?,?,?,?,?)',values).lastrowid
            else: db.execute('UPDATE assessments SET student_id=?,teacher_id=?,date=?,weight=?,height=?,waist=?,notes=?,objective=?,next_date=? WHERE id=?',(*values,eid))
            audit(db,u,'Salvou avaliação','assessments',eid); return
        if entity=='workout-sessions' and method=='POST':
            require_role(u,'student'); wid=number(d,'workout_id',1,100000,True)
            w=one(db,'SELECT * FROM workouts WHERE id=? AND active=1',(wid,))
            if not w: fail(404,'Treino indisponível.')
            allowed_student(db,u,w['student_id'])
            ex=rows(db,'SELECT we.*,e.name FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE workout_id=? ORDER BY position',(wid,))
            logs=d.get('logs')
            if not isinstance(logs,list) or len(logs)!=len(ex): fail(400,'Registre todos os exercícios antes de concluir.')
            if [number(l,'exercise_id',1,100000,True) for l in logs]!=[e['exercise_id'] for e in ex]: fail(400,'A ficha foi atualizada. Reabra o treino.')
            eid=db.execute('INSERT INTO workout_sessions(workout_id,student_id,created) VALUES(?,?,?)',(wid,u['id'],stamp())).lastrowid
            for e,l in zip(ex,logs): db.execute('INSERT INTO workout_logs(session_id,exercise_id,name,sets,reps,load) VALUES(?,?,?,?,?,?)',(eid,e['exercise_id'],e['name'],e['sets'],number(l,'reps',1,500,True),number(l,'load',0,1000)))
            audit(db,u,'Concluiu treino','workout_sessions',eid); return
        if entity=='settings' and method=='PUT':
            require_role(u,'admin'); db.execute('UPDATE settings SET gym_name=?,phone=?,address=? WHERE id=1',(text_field(d,'gym_name',2,100),text_field(d,'phone',0,40),text_field(d,'address',0,500))); audit(db,u,'Atualizou configurações','settings',1); return
        fail(404,'Operação não encontrada.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=os.environ.get('PORT','8000')); parser.add_argument('--host',default='127.0.0.1'); parser.add_argument('--seed-demo',action='store_true'); parser.add_argument('--create-admin',action='store_true'); args=parser.parse_args()
    if args.seed_demo and os.environ.get('GYMFLOW_DEMO','1')!='1': raise SystemExit('Ative GYMFLOW_DEMO=1 para gerar dados fictícios.')
    init_db(args.seed_demo)
    if args.create_admin:
        import getpass
        name=input('Nome do administrador: ').strip(); email=input('E-mail: ').strip().lower()
        pwd=getpass.getpass('Senha (mínimo 12 caracteres): ')
        if len(name)<2 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(pwd)<12:
            raise SystemExit('Nome, e-mail ou senha inválidos.')
        if pwd!=getpass.getpass('Confirme a senha: '): raise SystemExit('As senhas não coincidem.')
        with connect() as db:
            if db.execute("SELECT 1 FROM users WHERE role='admin'").fetchone(): raise SystemExit('Já existe um administrador. Nenhuma conta foi modificada.')
            db.execute("INSERT INTO users(name,email,password,role,created) VALUES(?,?,?,'admin',?)",(name,email,password_hash(pwd),stamp()))
        print('Administrador criado.'); raise SystemExit(0)
    print(f'GymFlow executando em http://{args.host}:{args.port}',flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
