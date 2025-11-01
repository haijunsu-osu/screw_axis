# Screw Axis Visualizer

This project provides an offline Three.js application that visualises the screw motion relating two rigid body poses. You can open the visualiser directly in your browser through [the live preview](https://htmlpreview.github.io/?https://github.com/haijunsu-osu/screw_axis/blob/main/index.html). A screw motion is the combination of a rotation about a line together with a translation along that same line. This representation comes from the Mozzi–Chasles theorem, which states that any proper Euclidean displacement of a rigid body can be expressed as a rotation by an angle $\phi$ about a screw axis $\mathbf{s}$, followed by a slide $d$ along that axis.

The application lets you edit the homogeneous transformation (3×4 matrix), or equivalently the intrinsic Euler angles and translation vector, and immediately computes:

- the unit direction $\mathbf{s}$ of the screw axis,
- a point $\mathbf{C}$ on that axis,
- the rotation angle $\phi$, and
- the translation distance $d$ along the axis.

It also renders the final and animated body frames, overlays the screw axis as a dashed line, highlights the axis point and its projection from the body origin, and traces the path of the moving frame during the screw motion.

## Theoretical background

Given a rigid-body transform

$$
D(\mathbf{x}) = A\mathbf{x} + \mathbf{t},
$$

the Mozzi–Chasles theorem (also known as Chasles’ theorem for kinematics) provides a constructive procedure for the screw parameters:

1. **Rotation axis direction** — The rotation matrix $A$ has a unique unit eigenvector associated with eigenvalue 1. Using quaternion extraction (or a matrix logarithm), we obtain the rotation axis $\mathbf{s}$ and angle $\phi$.
2. **Parallel/orthogonal translation split** — Decompose the translation vector $\mathbf{t}$ into components parallel and orthogonal to $\mathbf{s}$:

   $$
   \mathbf{t} = (\mathbf{t} \cdot \mathbf{s})\,\mathbf{s} + \mathbf{t}_\perp.
   $$

   The parallel component yields the axial slide $d = \mathbf{t} \cdot \mathbf{s}$.
3. **Axis point** — A point $\mathbf{C}$ on the axis is obtained by solving

   $$
   (I - A)\,\mathbf{C} = \mathbf{t}_\perp,
   $$

   together with the constraint $\mathbf{s} \cdot \mathbf{C} = 0$. This ensures $\mathbf{C}$ lies in the plane perpendicular to $\mathbf{s}$ through the origin. When $\mathbf{t}_\perp = \mathbf{0}$, the axis passes through the origin, so $\mathbf{C} = \mathbf{0}$.
4. **Pitch** — The pitch of the screw is $p = d / \phi$ (with units of length per radian) when $\phi \ne 0$.

This construction handles special cases: a vanishing rotation reduces to a pure translation along \(\mathbf{t}\); a vanishing translation yields a pure rotation about \(\mathbf{s}\).

## Visualisation features

- Editable 3×4 transform and Euler angles with bidirectional synchronisation.
- Read-only screw-parameter fields populated from the current transform.
- Static target body (opaque) and animated body (semi-transparent) showing the approach motion.
- Dashed orange screw axis, red axis point, and red line from world origin to the axis.
- Black foot point and perpendicular segment from the moving body origin to the axis.
- Black trajectory polyline marking the motion path of the body origin.
- OrbitControls camera and half-transparent XY ground grid.


## References

- [Screw axis – Wikipedia](https://en.wikipedia.org/wiki/Screw_axis)
- J. M. McCarthy and G. S. Soh, *Geometric Design of Linkages*, 2nd ed., Springer, 2010.
- O. Bottema and B. Roth, *Theoretical Kinematics*, Dover Publications, 1990.
