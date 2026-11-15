
import React from 'react';
import { Outlet } from 'react-router-dom';

import PublicHeader from '../components/layout/PublicHeader';
import PublicFooter from '../components/layout/PublicFooter';

export default function PublicLayout() {
  return (
    <>
      <PublicHeader />

      <main className="public-main">
        <Outlet />
      </main>

      <PublicFooter />
    </>
  );
}
