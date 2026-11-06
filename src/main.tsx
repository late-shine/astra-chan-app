import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

function renderApp() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Quiz Remake QZ1: development-only visual prototype of the new quiz studio (?quiz-preview=1).
// `import.meta.env.DEV` is a build-time constant, so a production build drops this branch and the preview chunk.
// It is not a feature flag: nothing is stored, and the real app is untouched without the query string. QZ12 removes it.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('quiz-preview') === '1') {
  import('./components/quiz/preview/QuizPreview.tsx')
    .then(({default: QuizPreview}) => {
      root.render(
        <StrictMode>
          <QuizPreview />
        </StrictMode>,
      );
    })
    .catch(() => renderApp());
} else {
  renderApp();
}
