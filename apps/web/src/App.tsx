import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/TodayPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { SemesterPage } from './pages/SemesterPage';
import { ImportPage } from './pages/ImportPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/course/:courseId" element={<CourseDetailPage />} />
        <Route path="/semester" element={<SemesterPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
