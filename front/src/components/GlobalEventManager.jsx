import React, { useEffect, useState } from 'react';
import api from '../Api';

const GlobalEventManager = () => {
  const [eventCode, setEventCode] = useState(null);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const res = await api.get('/events/active');
        if (res.data && res.data.code) {
          setEventCode(res.data.code);
        }
      } catch (error) {
        // Silent fail for events
        console.warn('Failed to fetch global events:', error);
      }
    };

    fetchActiveEvent();
  }, []);

  useEffect(() => {
    if (!eventCode) return;

    // Create a container
    const container = document.createElement('div');
    container.id = 'global-event-container';
    container.style.display = 'none'; // Hidden container for processing
    document.body.appendChild(container);

    // Set innerHTML (this renders HTML elements but scripts won't run)
    container.innerHTML = eventCode;

    // Find all scripts in the container
    const scripts = container.querySelectorAll('script');
    const loadedScripts = [];

    scripts.forEach((script) => {
      const newScript = document.createElement('script');
      
      // Copy attributes
      Array.from(script.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Copy content
      if (script.innerHTML) {
        newScript.appendChild(document.createTextNode(script.innerHTML));
      }
      
      // Append to body (or head) to execute
      document.body.appendChild(newScript);
      loadedScripts.push(newScript);
    });

    // Make the container visible if it has content content (not just scripts)
    // Actually, we want to render the HTML content visible too.
    // So we should append the HTML content to a visible place.
    // The user said "rendered in the body".
    // Let's move the container's children (HTML) to body or keep them in container and make it visible?
    // Since the container is just a wrapper, let's keep it but remove display:none if we want it visible.
    // But usually scripts inject fixed/absolute elements.
    // If the HTML is just `<div>Banner</div>`, we want it visible.
    container.style.display = 'block';

    // Cleanup function
    return () => {
      // Remove scripts
      loadedScripts.forEach(s => {
        if (s.parentNode) s.parentNode.removeChild(s);
      });
      // Remove container
      if (container.parentNode) container.parentNode.removeChild(container);
    };
  }, [eventCode]);

  // This component doesn't render anything in the React tree, 
  // it manipulates the DOM directly as requested "inside body".
  return null; 
};

export default GlobalEventManager;
