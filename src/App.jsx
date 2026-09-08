import { useMemo } from 'react';
import CourseViewer from './components/CourseViewer';
import { useBlockContextMenu } from './hooks/useBlockContextMenu';

/**
 * Lee los parámetros del visor de la URL, con los mismos nombres que usa el
 * visor legacy: /content_viewer/?idInit=<socialId>&idMateria=<idGrupo>&riesgo=0
 *
 * En la BD `idmateria` y `idgrupo` son el mismo valor, así que `idMateria` es
 * el id del curso que esperan los endpoints (`idGrupo` / `course_id`).
 */
function useViewerParams() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const idGrupo = params.get('idMateria') || params.get('idGrupo');
    return {
      idGrupo: idGrupo && /^\d+$/.test(idGrupo) ? Number(idGrupo) : null,
      socialId: params.get('idInit'),
      riesgo: params.get('riesgo') ?? 0,
      courseName: params.get('nombre') || undefined
    };
  }, []);
}

export default function App() {
  const { idGrupo, socialId, riesgo, courseName } = useViewerParams();

  // Mismo bloqueo del menú contextual que el visor legacy
  useBlockContextMenu();

  return (
    <CourseViewer
      idGrupo={idGrupo}
      socialId={socialId}
      riesgo={riesgo}
      courseName={courseName}
    />
  );
}
