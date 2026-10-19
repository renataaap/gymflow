"""Integration checks against an isolated, temporary SQLite database."""
import sys, os, tempfile, threading, unittest, json, urllib.request, urllib.error, http.cookiejar, sqlite3
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
import server

class Client:
    def __init__(self,base):
        self.base=base; self.csrf=''; self.cookies=http.cookiejar.CookieJar(); self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
    def call(self,path,method='GET',data=None,csrf=True,origin=None):
        headers={'Content-Type':'application/json'}
        if csrf: headers['X-CSRF-Token']=self.csrf
        if origin: headers['Origin']=origin
        r=urllib.request.Request(self.base+'/api/'+path,data=json.dumps(data or {}).encode() if method!='GET' else None,headers=headers,method=method)
        try:
            response=self.opener.open(r); return response.status,json.load(response)
        except urllib.error.HTTPError as e: return e.code,json.load(e)
    def login(self,email):
        code,data=self.call('login','POST',{'email':email,'password':'GymFlow@2026!'})
        assert code==200,(code,data)
        code,s=self.call('state');self.csrf=s['csrf'];return s

class GymFlowIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();server.DB_PATH=Path(cls.tmp.name)/'test.sqlite3';server.init_db(True)
        cls.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);threading.Thread(target=cls.http.serve_forever,daemon=True).start();cls.base=f'http://127.0.0.1:{cls.http.server_port}'
    @classmethod
    def tearDownClass(cls): cls.http.shutdown();cls.http.server_close();cls.tmp.cleanup()
    def client(self,email):
        c=Client(self.base);s=c.login(email);return c,s
    def test_01_demo_counts_and_hashes(self):
        c,s=self.client('admin@gymflow.demo')
        self.assertEqual([len(s[k]) for k in ['students','teachers','exercises','workouts','plans']],[15,3,30,10,3])
        self.assertNotIn('password',json.dumps(s))
        with server.connect() as db:
            self.assertNotEqual(db.execute('SELECT password FROM users LIMIT 1').fetchone()[0],'GymFlow@2026!')
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0],'ok')
    def test_02_admin_flow_persistence(self):
        c,s=self.client('admin@gymflow.demo')
        code,r=c.call('teachers','POST',dict(name='Profissional Teste',email='prof.teste@gymflow.demo',phone='',password='UmaSenhaForte123!',specialty='Força',registration='DEMO-99'))
        self.assertEqual(code,200,r);tid=r['id']
        student=dict(name='Pessoa Teste',email='pessoa.teste@gymflow.demo',phone='',password='UmaSenhaForte123!',teacher_id=tid,birthday='2000-01-01',objective='Força',consent=1)
        code,r=c.call('students','POST',student);self.assertEqual(code,200,r);sid=r['id']
        code,r=c.call('plans','POST',dict(name='Plano Teste',description='Teste',price=199,months=1,benefits='Treino • Avaliação'));self.assertEqual(code,200,r);pid=r.get('id')
        # Plans are retrieved from persisted state, never inferred IDs.
        _,s=c.call('state');pid=next(p['id'] for p in s['plans'] if p['name']=='Plano Teste')
        self.assertEqual(c.call('subscriptions','POST',dict(student_id=sid,plan_id=pid,due=server.today()))[0],200)
        _,s=c.call('state');p=next(p for p in s['payments'] if p['student_id']==sid);self.assertEqual(p['amount'],199)
        self.assertEqual(c.call('payments/'+str(p['id']),'PUT',dict(status='Pago',method='Dinheiro'))[0],200)
        self.assertEqual(c.call('payments/'+str(p['id']),'PUT',dict(status='Pago',method='Dinheiro'))[0],409)
        payment_id=p['id'];c2,s2=self.client('admin@gymflow.demo');self.assertEqual(next(p for p in s2['payments'] if p['id']==payment_id)['status'],'Pago')
        self.assertTrue(s2['audit'])
    def test_03_student_boundaries(self):
        c,s=self.client('aluno1@gymflow.demo');sid=s['user']['id'];self.assertEqual([r['id'] for r in s['students']],[sid]);self.assertEqual(s['teachers'],[]);self.assertEqual(s['audit'],[])
        for key in ['payments','attendance','assessments','workouts','sessions','subscriptions']:
            self.assertTrue(all(r['student_id']==sid for r in s[key]),key)
        self.assertEqual(c.call('attendance','POST',{'student_id':6})[0],403)
        self.assertEqual(c.call('students/'+str(sid),'PUT',{'role':'admin'})[0],403)
        self.assertEqual(c.call('plans','POST',{'name':'Ataque'})[0],403)
        c.call('profile','PUT',{'name':'Mariana Alves','phone':'','role':'admin'})
        self.assertEqual(c.call('state')[1]['user']['role'],'student')
        self.assertEqual(c.call('workout-sessions','POST',{'workout_id':2,'logs':[]})[0],403)
    def test_04_teacher_flow_versions_and_consent(self):
        c,s=self.client('professor1@gymflow.demo');self.assertTrue(all(x['teacher_id']==s['user']['id'] for x in s['students']));self.assertEqual(s['payments'],[])
        self.assertEqual(c.call('attendance','POST',{'student_id':5})[0],403)
        sid=s['students'][0]['id'];w=dict(student_id=sid,name='Ficha teste',objective='Força',division='A',notes='Controle',exercises=[dict(exercise_id=1,sets=3,reps='10',load=20,rest=60)])
        self.assertEqual(c.call('workouts','POST',w)[0],200)
        _,s=c.call('state');wid=next(x['id'] for x in s['workouts'] if x['name']=='Ficha teste');w.update(name='Ficha revisada',active=1);self.assertEqual(c.call('workouts/'+str(wid),'PUT',w)[0],200)
        _,s=c.call('state');revised=next(x for x in s['workouts'] if x['id']==wid);self.assertEqual(len(revised['versions']),1);self.assertEqual(json.loads(revised['versions'][0]['snapshot'])['name'],'Ficha teste')
        a=dict(student_id=sid,date=server.today(),weight=75,height=170,waist=80,notes='Evolução acompanhada',objective='Força',next_date=server.today());self.assertEqual(c.call('assessments','POST',a)[0],200)
        with server.connect() as db: db.execute('UPDATE students SET consent=0 WHERE user_id=?',(sid,))
        self.assertEqual(c.call('assessments','POST',a)[0],400)
    def test_05_student_training(self):
        c,s=self.client('aluno1@gymflow.demo');w=s['workouts'][0]
        logs=[dict(exercise_id=e['exercise_id'],load=25,reps=12) for e in w['exercises']]
        self.assertEqual(c.call('workout-sessions','POST',{'workout_id':w['id'],'logs':logs[:-1]})[0],400)
        self.assertEqual(c.call('workout-sessions','POST',{'workout_id':w['id'],'logs':logs})[0],200)
        _,s=c.call('state');self.assertEqual(s['sessions'][0]['logs'][0]['load'],25)
    def test_06_attendance_duplicates_and_csrf(self):
        c,s=self.client('aluno1@gymflow.demo');sid=s['user']['id']
        with server.connect() as db: db.execute('DELETE FROM attendance WHERE student_id=? AND day=?',(sid,server.today()))
        self.assertEqual(c.call('attendance','POST',{'student_id':sid},csrf=False)[0],403)
        self.assertEqual(c.call('attendance','POST',{'student_id':sid},origin='https://evil.example')[0],403)
        self.assertEqual(c.call('attendance','POST',{'student_id':sid})[0],200)
        self.assertEqual(c.call('attendance','POST',{'student_id':sid})[0],409)
    def test_07_validation_rollback(self):
        c,s=self.client('admin@gymflow.demo');count=len(s['students'])
        bad=dict(name='Não deve persistir',email='rollback@gymflow.demo',phone='',password='SenhaValida12345!',teacher_id=99999,consent=1,objective='')
        self.assertEqual(c.call('students','POST',bad)[0],400)
        self.assertEqual(len(c.call('state')[1]['students']),count)
        self.assertEqual(c.call('plans','POST',dict(name='Inválido',price=-1,months=1,description='Teste',benefits='Teste'))[0],400)
    def test_08_deactivation_and_logout(self):
        admin,s=self.client('admin@gymflow.demo');c,s=self.client('aluno2@gymflow.demo');sid=s['user']['id']
        self.assertEqual(admin.call('students/'+str(sid),'DELETE',{})[0],200)
        self.assertEqual(c.call('state')[0],401)
        self.assertEqual(admin.call('logout','POST',{})[0],200)
        self.assertEqual(admin.call('state')[0],401)
    def test_09_unauthenticated_denied(self): self.assertEqual(Client(self.base).call('state')[0],401)
    def test_10_sql_integrity(self):
        with server.connect() as db:
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(),[])
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0],'ok')

if __name__=='__main__': unittest.main(verbosity=2)
