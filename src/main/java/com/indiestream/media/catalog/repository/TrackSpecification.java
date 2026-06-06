package com.indiestream.media.catalog.repository;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Dynamic query builder for the Global Admin Registry.
 * Allows complex filtering without writing JPQL permutations.
 */
public class TrackSpecification {

    public static Specification<Track> buildAdminFilter(
            String searchQuery,
            List<UUID> matchingArtistIds,
            List<TrackStatus> statuses,
            Instant startDate,
            Instant endDate
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Status Filter (IN clause)
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }

            // Date Range Filters
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }

            // Search Query: ILIKE title OR artistId
            if (searchQuery != null && !searchQuery.trim().isEmpty()) {
                String likePattern = "%" + searchQuery.toLowerCase() + "%";
                Predicate titlePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("title")), likePattern
                );

                if (matchingArtistIds != null && !matchingArtistIds.isEmpty()) {
                    Predicate artistPredicate = root.get("artistId").in(matchingArtistIds);
                    predicates.add(criteriaBuilder.or(titlePredicate, artistPredicate));
                } else {
                    predicates.add(titlePredicate);
                }
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}