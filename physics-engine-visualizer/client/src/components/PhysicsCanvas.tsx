import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RigidBody, Joint, Manifold, Particle, Vector2, ToolMode } from '../types';
import { getWorldPoint } from '../utils/physicsUtils';

interface PhysicsCanvasProps {
  bodies: RigidBody[];
  joints: Joint[];
  manifolds: Manifold[];
  particles: Particle[];
  toolMode: ToolMode;
  selectedBody: string | null;
  onSelectBody: (id: string | null) => void;
  onCreateBody: (shape: RigidBody['shape'], position: Vector2) => void;
  onStartJoint: (bodyId: string, position: Vector2) => void;
  onEndJoint: (bodyId: string, position: Vector2) => void;
  onApplyImpulse: (bodyId: string, impulse: Vector2) => void;
  jointStart: { bodyId: string; position: Vector2 } | null;
  showTrails: boolean;
  showForces: boolean;
  showContacts: boolean;
}

const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  bodies,
  joints,
  manifolds,
  particles,
  toolMode,
  selectedBody,
  onSelectBody,
  onCreateBody,
  onStartJoint,
  onEndJoint,
  onApplyImpulse,
  jointStart,
  showTrails,
  showForces,
  showContacts
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<Vector2>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Vector2 | null>(null);
  const impulseStartRef = useRef<Vector2 | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (showTrails) {
      for (const body of bodies) {
        if (body.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(body.trail[0].x, body.trail[0].y);
          for (let i = 1; i < body.trail.length; i++) {
            ctx.lineTo(body.trail[i].x, body.trail[i].y);
          }
          ctx.strokeStyle = body.color + '80';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }

    for (const joint of joints) {
      if (joint.isBroken) continue;

      const bodyA = bodies.find(b => b.id === joint.bodyA);
      const bodyB = bodies.find(b => b.id === joint.bodyB);
      if (!bodyA || !bodyB) continue;

      const worldA = getWorldPoint(bodyA, joint.localAnchorA);
      const worldB = getWorldPoint(bodyB, joint.localAnchorB);

      ctx.beginPath();
      ctx.moveTo(worldA.x, worldA.y);
      ctx.lineTo(worldB.x, worldB.y);

      if (joint.type === 'spring') {
        ctx.strokeStyle = '#FFD700';
        ctx.setLineDash([5, 5]);
      } else if (joint.type === 'distance') {
        ctx.strokeStyle = '#00FF88';
        ctx.setLineDash([]);
      } else if (joint.type === 'hinge') {
        ctx.strokeStyle = '#FF6B6B';
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = '#4ECDC4';
        ctx.setLineDash([3, 3]);
      }
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);

      if (showForces) {
        const forceScale = 0.1;
        const forceMag = Math.sqrt(joint.force.x ** 2 + joint.force.y ** 2);
        const hue = Math.max(0, 120 - forceMag * 2);
        const forceColor = `hsl(${hue}, 100%, 50%)`;

        const midX = (worldA.x + worldB.x) / 2;
        const midY = (worldA.y + worldB.y) / 2;

        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + joint.force.x * forceScale, midY + joint.force.y * forceScale);
        ctx.strokeStyle = forceColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const angle = Math.atan2(joint.force.y, joint.force.x);
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(midX + joint.force.x * forceScale, midY + joint.force.y * forceScale);
        ctx.lineTo(
          midX + joint.force.x * forceScale - arrowSize * Math.cos(angle - Math.PI / 6),
          midY + joint.force.y * forceScale - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(midX + joint.force.x * forceScale, midY + joint.force.y * forceScale);
        ctx.lineTo(
          midX + joint.force.x * forceScale - arrowSize * Math.cos(angle + Math.PI / 6),
          midY + joint.force.y * forceScale - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(worldA.x, worldA.y, 5, 0, Math.PI * 2);
      ctx.arc(worldB.x, worldB.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    for (const body of bodies) {
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.rotation);

      let fillColor = body.color;
      if (body.isSleeping) {
        fillColor = '#555555';
      }
      if (body.id === selectedBody) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = body.isStatic ? '#ffffff' : '#000000';
      ctx.lineWidth = body.isStatic ? 3 : 2;

      if (body.shape.type === 'circle') {
        const radius = body.shape.radius || 20;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, 0);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const vertices = body.shape.vertices || [];
        ctx.beginPath();
        if (vertices.length > 0) {
          ctx.moveTo(vertices[0].x, vertices[0].y);
          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
          }
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    if (showContacts) {
      for (const manifold of manifolds) {
        for (const contact of manifold.contacts) {
          ctx.beginPath();
          ctx.arc(contact.point.x, contact.point.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#FF0000';
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(contact.point.x, contact.point.y);
          ctx.lineTo(
            contact.point.x + contact.normal.x * 30,
            contact.point.y + contact.normal.y * 30
          );
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(contact.point.x, contact.point.y);
          ctx.lineTo(
            contact.point.x + contact.tangent.x * 20,
            contact.point.y + contact.tangent.y * 20
          );
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    if (jointStart) {
      const body = bodies.find(b => b.id === jointStart.bodyId);
      if (body) {
        const worldAnchor = getWorldPoint(body, jointStart.position);
        ctx.beginPath();
        ctx.moveTo(worldAnchor.x, worldAnchor.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (toolMode === 'create-circle') {
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 25, 0, Math.PI * 2);
      ctx.strokeStyle = '#4ECDC4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (toolMode === 'create-box') {
      ctx.strokeRect(mousePos.x - 25, mousePos.y - 20, 50, 40);
      ctx.strokeStyle = '#4ECDC4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
    }

    if (isDragging && toolMode === 'apply-impulse' && impulseStartRef.current) {
      ctx.beginPath();
      ctx.moveTo(impulseStartRef.current.x, impulseStartRef.current.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 3;
      ctx.stroke();

      const dx = mousePos.x - impulseStartRef.current.x;
      const dy = mousePos.y - impulseStartRef.current.y;
      const angle = Math.atan2(dy, dx);
      const arrowSize = 15;
      ctx.beginPath();
      ctx.moveTo(mousePos.x, mousePos.y);
      ctx.lineTo(
        mousePos.x - arrowSize * Math.cos(angle - Math.PI / 6),
        mousePos.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(mousePos.x, mousePos.y);
      ctx.lineTo(
        mousePos.x - arrowSize * Math.cos(angle + Math.PI / 6),
        mousePos.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  }, [bodies, joints, manifolds, particles, selectedBody, jointStart, mousePos, isDragging, toolMode, showTrails, showForces, showContacts]);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [render]);

  const getCanvasCoords = (e: React.MouseEvent): Vector2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findBodyAtPosition = (pos: Vector2): RigidBody | null => {
    for (const body of bodies) {
      if (body.shape.type === 'circle') {
        const dist = Math.sqrt(
          (pos.x - body.position.x) ** 2 +
          (pos.y - body.position.y) ** 2
        );
        if (dist < (body.shape.radius || 20)) {
          return body;
        }
      } else {
        const vertices = body.shape.vertices || [];
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i].x + body.position.x;
          const yi = vertices[i].y + body.position.y;
          const xj = vertices[j].x + body.position.x;
          const yj = vertices[j].y + body.position.y;

          if (((yi > pos.y) !== (yj > pos.y)) &&
              (pos.x < (xj - xi) * (pos.y - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        if (inside) return body;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);
    setIsDragging(true);
    setDragStart(pos);

    if (toolMode === 'apply-impulse') {
      impulseStartRef.current = pos;
    } else if (toolMode === 'select') {
      const body = findBodyAtPosition(pos);
      onSelectBody(body?.id || null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);

    if (toolMode === 'create-circle') {
      onCreateBody({ type: 'circle', radius: 25 }, pos);
    } else if (toolMode === 'create-box') {
      onCreateBody({
        type: 'polygon',
        vertices: [
          { x: -25, y: -20 },
          { x: 25, y: -20 },
          { x: 25, y: 20 },
          { x: -25, y: 20 }
        ]
      }, pos);
    } else if (toolMode === 'create-joint') {
      const body = findBodyAtPosition(pos);
      if (body && !body.isStatic) {
        if (!jointStart) {
          onStartJoint(body.id, { x: pos.x - body.position.x, y: pos.y - body.position.y });
        } else if (body.id !== jointStart.bodyId) {
          onEndJoint(body.id, { x: pos.x - body.position.x, y: pos.y - body.position.y });
        }
      }
    } else if (toolMode === 'apply-impulse' && impulseStartRef.current && dragStart) {
      const body = findBodyAtPosition(dragStart);
      if (body) {
        const impulse = {
          x: (pos.x - impulseStartRef.current.x) * 10,
          y: (pos.y - impulseStartRef.current.y) * 10
        };
        onApplyImpulse(body.id, impulse);
      }
    }

    setIsDragging(false);
    setDragStart(null);
    impulseStartRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos(getCanvasCoords(e));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelectBody(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border-2 border-gray-700 rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onContextMenu={handleContextMenu}
    />
  );
};

export default PhysicsCanvas;
