import { PropsWithChildren } from 'react';

type TProps = PropsWithChildren<{}>;

const PathGuard: React.FC<TProps> = ({ children }) => {
  return children;
};

export default PathGuard;
