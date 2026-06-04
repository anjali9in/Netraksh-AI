import React from 'react';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
  SvgProps,
} from 'react-native-svg';

export type ButtonIconName =
  | 'arrowLeft'
  | 'camera'
  | 'check'
  | 'chart'
  | 'close'
  | 'home'
  | 'logs'
  | 'menu'
  | 'refresh'
  | 'settings'
  | 'shield'
  | 'user'
  | 'userPlus';

type ButtonIconProps = {
  name: ButtonIconName;
  color?: string;
  size?: number;
};

type IconShapeProps = Pick<SvgProps, 'stroke' | 'strokeWidth'>;

export function ButtonIcon({
  name,
  color = '#ffffff',
  size = 20,
}: ButtonIconProps): React.JSX.Element {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {renderIcon(name, {
        stroke: color,
        strokeWidth: 2,
      })}
    </Svg>
  );
}

function renderIcon(name: ButtonIconName, props: IconShapeProps) {
  const lineProps = {
    ...props,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'arrowLeft':
      return (
        <>
          <Line x1="19" x2="5" y1="12" y2="12" {...lineProps} />
          <Polyline points="12 19 5 12 12 5" {...lineProps} />
        </>
      );
    case 'camera':
      return (
        <>
          <Path
            d="M14.5 5.5 13 3H9L7.5 5.5H5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7.5a2 2 0 0 0-2-2h-4.5Z"
            {...lineProps}
          />
          <Circle cx="12" cy="13" r="3.5" {...lineProps} />
        </>
      );
    case 'check':
      return <Polyline points="20 6 9 17 4 12" {...lineProps} />;
    case 'chart':
      return (
        <>
          <Line x1="4" x2="20" y1="20" y2="20" {...lineProps} />
          <Rect height="7" width="3" x="6" y="11" {...lineProps} />
          <Rect height="12" width="3" x="11" y="6" {...lineProps} />
          <Rect height="9" width="3" x="16" y="9" {...lineProps} />
        </>
      );
    case 'close':
      return (
        <>
          <Line x1="18" x2="6" y1="6" y2="18" {...lineProps} />
          <Line x1="6" x2="18" y1="6" y2="18" {...lineProps} />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" {...lineProps} />
        </>
      );
    case 'logs':
      return (
        <>
          <Path d="M6 3h9l3 3v18H6z" {...lineProps} />
          <Path d="M15 3v6h6" {...lineProps} />
          <Line x1="9" x2="17" y1="12" y2="12" {...lineProps} />
          <Line x1="9" x2="17" y1="16" y2="16" {...lineProps} />
        </>
      );
    case 'menu':
      return (
        <>
          <Line x1="4" x2="20" y1="6" y2="6" {...lineProps} />
          <Line x1="4" x2="20" y1="12" y2="12" {...lineProps} />
          <Line x1="4" x2="20" y1="18" y2="18" {...lineProps} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path d="M20 6v5h-5" {...lineProps} />
          <Path d="M4 18v-5h5" {...lineProps} />
          <Path d="M18 9a7 7 0 0 0-11.7-3.2L4 8" {...lineProps} />
          <Path d="M6 15a7 7 0 0 0 11.7 3.2L20 16" {...lineProps} />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3" {...lineProps} />
          <Path
            d="M19.4 15a8 8 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 6.5h-4l-.4 2.5a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.4 2.5h4l.4-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.2-1.5Z"
            {...lineProps}
          />
        </>
      );
    case 'shield':
      return (
        <>
          <Path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
            {...lineProps}
          />
          <Path d="m9 12 2 2 4-5" {...lineProps} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx="12" cy="8" r="4" {...lineProps} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...lineProps} />
        </>
      );
    case 'userPlus':
      return (
        <>
          <Circle cx="9" cy="8" r="4" {...lineProps} />
          <Path d="M3 21a6 6 0 0 1 12 0" {...lineProps} />
          <Line x1="19" x2="19" y1="8" y2="16" {...lineProps} />
          <Line x1="15" x2="23" y1="12" y2="12" {...lineProps} />
        </>
      );
  }
}
