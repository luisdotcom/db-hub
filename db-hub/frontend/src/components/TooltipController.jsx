
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TooltipController = () => {
    const [activeTooltip, setActiveTooltip] = useState(null);

    useEffect(() => {
        let currentTarget = null;

        const handleCheck = (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                const text = target.getAttribute('data-tooltip');
                const position = target.getAttribute('data-tooltip-pos') || 'top';
                const rect = target.getBoundingClientRect();

                if (currentTarget !== target) {
                    currentTarget = target;
                    setActiveTooltip({ text, rect, position });
                } else {
                    setActiveTooltip(prev => ({ ...prev, text, rect, position }));
                }
            } else {
                if (currentTarget) {
                    currentTarget = null;
                    setActiveTooltip(null);
                }
            }
        };

        const handleScroll = () => {
            if (currentTarget) {
                currentTarget = null;
                setActiveTooltip(null);
            }
        };

        document.addEventListener('mousemove', handleCheck);
        window.addEventListener('scroll', handleScroll, { capture: true });

        return () => {
            document.removeEventListener('mousemove', handleCheck);
            window.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, []);

    if (!activeTooltip) return null;

    const { rect, text, position } = activeTooltip;
    const style = {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
    };

    let top = rect.top - 10;
    let left = rect.left + (rect.width / 2);
    let transform = 'translate(-50%, -100%)';
    let arrowClass = 'arrow-bottom';

    if (position === 'bottom') {
        top = rect.bottom + 10;
        left = rect.left + (rect.width / 2);
        transform = 'translate(-50%, 0)';
        arrowClass = 'arrow-top';
    } else if (position === 'left') {
        top = rect.top + (rect.height / 2);
        left = rect.left - 10;
        transform = 'translate(-100%, -50%)';
        arrowClass = 'arrow-right';
    } else if (position === 'right') {
        top = rect.top + (rect.height / 2);
        left = rect.right + 10;
        transform = 'translate(0, -50%)';
        arrowClass = 'arrow-left';
    }

    style.top = `${top}px`;
    style.left = `${left}px`;
    style.transform = transform;

    return createPortal(
        <div style={style}>
            <div className={`portal-tooltip ${arrowClass}`}>
                {text}
                <div className={`tooltip-arrow ${arrowClass}`} />
            </div>
        </div>,
        document.body
    );
};

export default TooltipController;
