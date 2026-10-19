DO $$
DECLARE item TEXT;
BEGIN
 FOREACH item IN ARRAY ARRAY['workouts','assessments','attendance','workout_sessions'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',item);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',item);
  EXECUTE format('CREATE POLICY scoped_read ON %I FOR SELECT USING(gymflow_student_visible(student_id))',item);
 END LOOP;
END $$;
CREATE POLICY workouts_write ON workouts FOR ALL USING(gymflow_is_admin() OR (current_setting('gymflow.role',true)='teacher' AND gymflow_student_visible(student_id))) WITH CHECK(gymflow_is_admin() OR (current_setting('gymflow.role',true)='teacher' AND gymflow_student_visible(student_id)));
CREATE POLICY assessments_write ON assessments FOR ALL USING(gymflow_is_admin() OR (current_setting('gymflow.role',true)='teacher' AND gymflow_student_visible(student_id))) WITH CHECK(gymflow_is_admin() OR (current_setting('gymflow.role',true)='teacher' AND gymflow_student_visible(student_id)));
CREATE POLICY attendance_write ON attendance FOR INSERT WITH CHECK(gymflow_student_visible(student_id) AND (gymflow_is_admin() OR actor_id=gymflow_uid()));
CREATE POLICY sessions_write ON workout_sessions FOR INSERT WITH CHECK(gymflow_is_admin() OR (current_setting('gymflow.role',true)='student' AND student_id=gymflow_uid()));
DO $$
DECLARE item TEXT;
BEGIN
 FOREACH item IN ARRAY ARRAY['payments','subscriptions'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',item);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',item);
  EXECUTE format('CREATE POLICY finance_read ON %I FOR SELECT USING(gymflow_is_admin() OR (current_setting(''gymflow.role'',true)=''student'' AND student_id=gymflow_uid()))',item);
  EXECUTE format('CREATE POLICY finance_write ON %I FOR ALL USING(gymflow_is_admin()) WITH CHECK(gymflow_is_admin())',item);
 END LOOP;
 FOREACH item IN ARRAY ARRAY['workout_exercises','workout_versions'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',item);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',item);
  EXECUTE format('CREATE POLICY workout_children_read ON %I FOR SELECT USING(EXISTS(SELECT 1 FROM workouts WHERE id=workout_id))',item);
  EXECUTE format('CREATE POLICY workout_children_write ON %I FOR ALL USING(gymflow_is_admin() OR (current_setting(''gymflow.role'',true)=''teacher'' AND EXISTS(SELECT 1 FROM workouts WHERE id=workout_id))) WITH CHECK(gymflow_is_admin() OR (current_setting(''gymflow.role'',true)=''teacher'' AND EXISTS(SELECT 1 FROM workouts WHERE id=workout_id)))',item);
 END LOOP;
END $$;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY logs_read ON workout_logs FOR SELECT USING(EXISTS(SELECT 1 FROM workout_sessions WHERE id=session_id));
CREATE POLICY logs_write ON workout_logs FOR INSERT WITH CHECK(gymflow_is_admin() OR EXISTS(SELECT 1 FROM workout_sessions WHERE id=session_id AND student_id=gymflow_uid()));
